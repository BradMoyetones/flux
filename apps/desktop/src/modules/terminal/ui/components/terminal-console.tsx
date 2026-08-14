import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { api } from '@flux/api';
import { useTerminalStore } from '../../core/use-terminal-store';
import '@xterm/xterm/css/xterm.css';
import { Trash2 } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';

export function TerminalConsole() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalInstance = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    
    const { fontSize, theme } = useTerminalStore();

    useEffect(() => {
        if (!terminalRef.current) return;

        const term = new Terminal({
            fontSize,
            theme: {
                background: theme === 'dark' ? '#09090b' : '#ffffff',
                foreground: theme === 'dark' ? '#f4f4f5' : '#09090b',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            cursorBlink: true,
            convertEol: true,
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        
        term.open(terminalRef.current);
        
        // Timeout para asegurar de que el DOM está listo antes de calcular dimensiones
        setTimeout(() => fit.fit(), 50);

        terminalInstance.current = term;
        fitAddon.current = fit;

        term.writeln('\x1b[32m[Flux Terminal]\x1b[0m Ready and waiting for logs...\r\n');

        // Petición del historial acumulado
        api.window.getTerminalHistory()
            .then(history => {
                if (history && history.length > 0) {
                    term.write(history.join(''));
                }
            })
            .catch(console.error);

        const unlisten = api.events.listen<string>('terminal://stdout', (event) => {
            term.write(event.payload);
        });

        const resizeObserver = new ResizeObserver(() => {
            // Debounce the fit to avoid aggressive resizing errors
            requestAnimationFrame(() => fit.fit());
        });
        resizeObserver.observe(terminalRef.current);

        return () => {
            unlisten.then(unsub => unsub());
            resizeObserver.disconnect();
            term.dispose();
        };
    }, []); // Only run once on mount

    useEffect(() => {
        if (terminalInstance.current) {
            terminalInstance.current.options.fontSize = fontSize;
            terminalInstance.current.options.theme = {
                background: theme === 'dark' ? '#09090b' : '#ffffff',
                foreground: theme === 'dark' ? '#f4f4f5' : '#09090b',
            };
            setTimeout(() => fitAddon.current?.fit(), 10);
        }
    }, [fontSize, theme]);

    const handleClear = () => {
        terminalInstance.current?.clear();
    };

    return (
        <div className="flex flex-col h-full w-full bg-card shadow-inner group">
            <div className="flex items-center justify-between px-3 py-1 border-b border-border/50 bg-muted/20">
                <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">Debug Console</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleClear} title="Clear Terminal">
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 w-full relative">
                <div ref={terminalRef} className="absolute inset-0 p-2 overflow-hidden" />
            </div>
        </div>
    );
}
