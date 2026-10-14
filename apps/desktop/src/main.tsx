import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { RouterProvider } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import router from './shared/router';
import { Toaster } from '@flux/ui/sonner';
import { useUpdater } from './ui/hooks/use-updater';
import { TooltipProvider } from '@flux/ui/tooltip';
import { ColorThemeProvider } from './shared/contexts/color-theme-provider';
import { useUserStore } from './shared/stores/user-store';

import './ui/styles/index.css';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

function UpdaterComponent() {
    const { checkForUpdates, promptUpdate } = useUpdater();

    useEffect(() => {
        // El splash se cierra en cuanto la UI montó: NUNCA depende de la red.
        // (Rust además lo fuerza tras un timeout de seguridad.)
        invoke('close_splashscreen').catch(console.error);

        // La revisión de actualizaciones corre después, sin bloquear el arranque.
        checkForUpdates()
            .then((update) => {
                if (update) promptUpdate(update);
            })
            .catch(console.error);
    }, []);

    return null;
}

function FloatVersionComponent() {
    const { appVersion } = useUpdater();
    return (
        <div className="fixed bottom-2 right-2 z-50">
            <p className="text-muted-foreground text-sm">v{appVersion}</p>
        </div>
    );
}

async function initApp() {
    try {
        // Inicializar el store de Zustand desde tauri-plugin-store
        await useUserStore.getState().initStore();
    } catch (error) {
        console.error("Error al inicializar el store:", error);
    }

    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
        <React.StrictMode>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <ErrorBoundary>
                    <ColorThemeProvider>
                        <TooltipProvider delayDuration={0}>
                            <RouterProvider router={router} />
                            <Toaster />

                            {/* Componentes de utilidad en segundo plano */}
                            <UpdaterComponent />
                            <FloatVersionComponent />
                        </TooltipProvider>
                    </ColorThemeProvider>
                </ErrorBoundary>
            </ThemeProvider>
        </React.StrictMode>
    );
}

initApp();
