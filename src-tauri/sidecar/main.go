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
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	_ "modernc.org/sqlite"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

var (
	cli      *whatsmeow.Client
	qrChan   = make(chan string, 1)
	connChan = make(chan struct{}, 1)

	chatList     []ChatInfo
	chatsMutex   sync.RWMutex
	startTime    time.Time
	statsMutex   sync.RWMutex
	messagesSent int
)

type ChatInfo struct {
	JID         string `json:"jid"`
	Name        string `json:"name"`
	UnreadCount int    `json:"unreadCount"`
}

func init() {
	startTime = time.Now()
}

func eventHandler(rawEvt interface{}) {
	switch evt := rawEvt.(type) {
	case *events.HistorySync:
		chatsMutex.Lock()
		for _, conv := range evt.Data.GetConversations() {
			chatList = append(chatList, ChatInfo{
				JID:         conv.GetID(),
				Name:        conv.GetID(), // fallback, display names aren't always here
				UnreadCount: int(conv.GetUnreadCount()),
			})
		}
		chatsMutex.Unlock()
	case *events.Message:
		if evt.Info.IsFromMe {
			statsMutex.Lock()
			messagesSent++
			statsMutex.Unlock()
		}
	}
}

func formatJID(phone string) types.JID {
	if strings.Contains(phone, "@") {
		jid, err := types.ParseJID(phone)
		if err == nil {
			return jid
		}
	}
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
	dsn := fmt.Sprintf("file:%s?_foreign_keys=on&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)", *dbPath)
	container, err := sqlstore.New(context.Background(), "sqlite", dsn, dbLog)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Fatalf("Failed to get device store: %v", err)
	}

	clientLog := waLog.Stdout("Client", "WARN", true)
	cli = whatsmeow.NewClient(deviceStore, clientLog)
	cli.AddEventHandler(eventHandler)

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
	http.HandleFunc("/profile", handleProfile)
	http.HandleFunc("/profile-pic", handleProfilePic)
	http.HandleFunc("/stats", handleStats)
	http.HandleFunc("/groups", handleGroups)

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
	w.Header().Set("Access-Control-Allow-Origin", "*")
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
	chatsMutex.RLock()
	defer chatsMutex.RUnlock()
	json.NewEncoder(w).Encode(chatList)
}

func handleContacts(w http.ResponseWriter, r *http.Request) {
	if cli.Store.Contacts == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{})
		return
	}
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

func handleProfile(w http.ResponseWriter, r *http.Request) {
	if cli.Store.ID == nil {
		http.Error(w, "Not connected", http.StatusUnauthorized)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"jid":      cli.Store.ID.String(),
		"pushName": cli.Store.PushName,
	})
}

func handleProfilePic(w http.ResponseWriter, r *http.Request) {
	jidStr := r.URL.Query().Get("jid")
	if jidStr == "" {
		http.Error(w, "Missing jid", http.StatusBadRequest)
		return
	}
	jid := formatJID(jidStr)
	pic, err := cli.GetProfilePictureInfo(r.Context(), jid, &whatsmeow.GetProfilePictureParams{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if pic == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"url": ""})
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"url": pic.URL,
	})
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	statsMutex.RLock()
	sent := messagesSent
	statsMutex.RUnlock()

	contactsCount := 0
	if cli.Store.Contacts != nil {
		if c, err := cli.Store.Contacts.GetAllContacts(context.Background()); err == nil {
			contactsCount = len(c)
		}
	}

	chatsMutex.RLock()
	chatsCount := len(chatList)
	chatsMutex.RUnlock()

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"messagesSent":  sent,
		"contactsCount": contactsCount,
		"chatsCount":    chatsCount,
		"uptime":        int(time.Since(startTime).Seconds()),
		"memoryMB":      m.Alloc / 1024 / 1024,
	})
}

func handleGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := cli.GetJoinedGroups(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	type GroupInfo struct {
		JID  string `json:"jid"`
		Name string `json:"name"`
	}

	var res []GroupInfo
	for _, g := range groups {
		res = append(res, GroupInfo{
			JID:  g.JID.String(),
			Name: g.Name,
		})
	}
	json.NewEncoder(w).Encode(res)
}
