package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"

	_ "modernc.org/sqlite"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

var (
	cli      *whatsmeow.Client
	qrChan   = make(chan string, 1)
	connChan = make(chan struct{}, 1)
)

func formatJID(phone string) types.JID {
	phone = strings.TrimPrefix(phone, "+")
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	return types.NewJID(phone, types.DefaultUserServer)
}

func main() {
	port := flag.Int("port", 0, "HTTP server port")
	dbPath := flag.String("db-path", "", "Path to SQLite session database")
	flag.Parse()

	if *port == 0 || *dbPath == "" {
		log.Println("Missing required flags: --port and --db-path")
		os.Exit(1)
	}

	log.SetOutput(os.Stderr)

	dbLog := waLog.Stdout("Database", "WARN", true)
	container, err := sqlstore.New(context.Background(), "sqlite", fmt.Sprintf("file:%s?_foreign_keys=on", *dbPath), dbLog)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Fatalf("Failed to get device store: %v", err)
	}

	clientLog := waLog.Stdout("Client", "WARN", true)
	cli = whatsmeow.NewClient(deviceStore, clientLog)

	if cli.Store.ID == nil {
		qrChannel, _ := cli.GetQRChannel(context.Background())
		go func() {
			for evt := range qrChannel {
				if evt.Event == "code" {
					select {
					case qrChan <- evt.Code:
					default:
					}
				} else if evt.Event == "success" {
					select {
					case connChan <- struct{}{}:
					default:
					}
				}
			}
		}()
	}

	err = cli.Connect()
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/qr", handleQR)
	http.HandleFunc("/send-message", handleSendMessage)
	http.HandleFunc("/send-media", handleSendMedia)
	http.HandleFunc("/chats", handleChats)
	http.HandleFunc("/contacts", handleContacts)
	http.HandleFunc("/disconnect", handleDisconnect)

	server := &http.Server{Addr: fmt.Sprintf(":%d", *port)}

	go func() {
		log.Printf("Starting HTTP server on port %d", *port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Shutting down...")
	server.Shutdown(context.Background())
	cli.Disconnect()
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	connected := cli.IsConnected()
	var jid string
	if cli.Store.ID != nil {
		jid = cli.Store.ID.String()
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"connected": connected,
		"jid":       jid,
	})
}

func handleQR(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	if cli.Store.ID != nil {
		fmt.Fprintf(w, "data: CONNECTED\n\n")
		flusher.Flush()
		return
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	for {
		select {
		case <-ctx.Done():
			return
		case qr := <-qrChan:
			fmt.Fprintf(w, "data: %s\n\n", qr)
			flusher.Flush()
		case <-connChan:
			fmt.Fprintf(w, "data: CONNECTED\n\n")
			flusher.Flush()
			return
		}
	}
}

func handleSendMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		To   string `json:"to"`
		Text string `json:"text"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	jid := formatJID(req.To)
	msg := &waE2E.Message{
		Conversation: proto.String(req.Text),
	}

	resp, err := cli.SendMessage(context.Background(), jid, msg)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "success",
		"timestamp": resp.Timestamp,
	})
}

func handleSendMedia(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		To        string `json:"to"`
		MediaPath string `json:"mediaPath"`
		Caption   string `json:"caption"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	data, err := os.ReadFile(req.MediaPath)
	if err != nil {
		http.Error(w, "Failed to read media file", http.StatusInternalServerError)
		return
	}

	ext := strings.ToLower(filepath.Ext(req.MediaPath))
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	var msg *waE2E.Message
	if strings.HasPrefix(mimeType, "image/") {
		resp, err := cli.Upload(context.Background(), data, whatsmeow.MediaImage)
		if err != nil {
			http.Error(w, "Failed to upload image", http.StatusInternalServerError)
			return
		}
		msg = &waE2E.Message{
			ImageMessage: &waE2E.ImageMessage{
				Caption:       proto.String(req.Caption),
				Mimetype:      proto.String(mimeType),
				URL:           proto.String(resp.URL),
				DirectPath:    proto.String(resp.DirectPath),
				MediaKey:      resp.MediaKey,
				FileEncSHA256: resp.FileEncSHA256,
				FileSHA256:    resp.FileSHA256,
				FileLength:    proto.Uint64(uint64(len(data))),
			},
		}
	} else if strings.HasPrefix(mimeType, "video/") {
		resp, err := cli.Upload(context.Background(), data, whatsmeow.MediaVideo)
		if err != nil {
			http.Error(w, "Failed to upload video", http.StatusInternalServerError)
			return
		}
		msg = &waE2E.Message{
			VideoMessage: &waE2E.VideoMessage{
				Caption:       proto.String(req.Caption),
				Mimetype:      proto.String(mimeType),
				URL:           proto.String(resp.URL),
				DirectPath:    proto.String(resp.DirectPath),
				MediaKey:      resp.MediaKey,
				FileEncSHA256: resp.FileEncSHA256,
				FileSHA256:    resp.FileSHA256,
				FileLength:    proto.Uint64(uint64(len(data))),
			},
		}
	} else {
		resp, err := cli.Upload(context.Background(), data, whatsmeow.MediaDocument)
		if err != nil {
			http.Error(w, "Failed to upload document", http.StatusInternalServerError)
			return
		}
		msg = &waE2E.Message{
			DocumentMessage: &waE2E.DocumentMessage{
				Title:         proto.String(filepath.Base(req.MediaPath)),
				Mimetype:      proto.String(mimeType),
				URL:           proto.String(resp.URL),
				DirectPath:    proto.String(resp.DirectPath),
				MediaKey:      resp.MediaKey,
				FileEncSHA256: resp.FileEncSHA256,
				FileSHA256:    resp.FileSHA256,
				FileLength:    proto.Uint64(uint64(len(data))),
			},
		}
	}

	jid := formatJID(req.To)
	resp, err := cli.SendMessage(context.Background(), jid, msg)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "success",
		"timestamp": resp.Timestamp,
	})
}

func handleChats(w http.ResponseWriter, r *http.Request) {
	// Not fully implemented for full chat history, but just basic store access
	// whatsmeow v0.2+ stores chat list in app state if synced, but we can just return what's in deviceStore if any
	// returning an empty array for now as true chat sync requires handling events
	json.NewEncoder(w).Encode([]interface{}{})
}

func handleContacts(w http.ResponseWriter, r *http.Request) {
	contacts, err := cli.Store.Contacts.GetAllContacts(context.Background())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(contacts)
}

func handleDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	cli.Disconnect()
	err := cli.Logout(context.Background())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "disconnected"})
}
