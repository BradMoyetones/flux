import { Button } from '@/ui/components/ui/button';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { CircleCheck, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getVersion } from '@tauri-apps/api/app';
import {
    CustomToast,
    CustomToastActions,
    CustomToastContent,
    CustomToastDescription,
    CustomToastHeader,
    CustomToastIcon,
    CustomToastTitle,
} from '@/ui/components/ui/custom-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { Streamdown } from 'streamdown';
import { ScrollArea } from '@/ui/components/ui/scroll-area';

const useUpdater = () => {
    const [appVersion, setAppVersion] = useState('');
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [notesContent, setNotesContent] = useState('');

    useEffect(() => {
        getVersion().then((v) => setAppVersion(v));
    }, []);

    async function checkForUpdates() {
        try {
            const update = await check();
            if (update) {
                // Guarda las notas para poder mostrarlas en el Dialog
                setNotesContent(update.body || 'Hay mejoras y correcciones disponibles.');

                toast.custom(
                    (t) => (
                        <CustomToast type="info">
                            <CustomToastHeader>
                                <CustomToastIcon>
                                    <Info className="size-4" />
                                </CustomToastIcon>
                                <CustomToastContent>
                                    <CustomToastTitle>Nueva versión disponible: v{update.version}</CustomToastTitle>
                                    <CustomToastDescription>
                                        Hay mejoras y correcciones disponibles.
                                    </CustomToastDescription>
                                </CustomToastContent>
                            </CustomToastHeader>
                            <CustomToastActions className="mt-4">
                                <Button
                                    onClick={() => {
                                        setIsNotesOpen(true);
                                    }}
                                    variant="outline"
                                    size="sm"
                                >
                                    Notas de la versión
                                </Button>
                                <Button
                                    onClick={async () => {
                                        toast.dismiss(t);
                                        const installingToast = toast.loading('Descargando actualización...');
                                        try {
                                            await update.downloadAndInstall((event) => {
                                                if (event.event === 'Started' && event.data.contentLength) {
                                                    toast.loading('Descargando actualización...', {
                                                        id: installingToast,
                                                    });
                                                } else if (event.event === 'Finished') {
                                                    toast.dismiss(installingToast);
                                                    toast.custom(
                                                        (t2) => (
                                                            <CustomToast type="success">
                                                                <CustomToastHeader>
                                                                    <CustomToastIcon>
                                                                        <CircleCheck className="size-4" />
                                                                    </CustomToastIcon>
                                                                    <CustomToastContent>
                                                                        <CustomToastTitle>
                                                                            Actualización lista
                                                                        </CustomToastTitle>
                                                                        <CustomToastDescription>
                                                                            La nueva versión se aplicará al reiniciar.
                                                                        </CustomToastDescription>
                                                                    </CustomToastContent>
                                                                </CustomToastHeader>
                                                                <CustomToastActions>
                                                                    <Button
                                                                        onClick={() => toast.dismiss(t2)}
                                                                        variant={'secondary'}
                                                                        size="sm"
                                                                    >
                                                                        Más tarde
                                                                    </Button>
                                                                    <Button
                                                                        onClick={async () => {
                                                                            toast.dismiss(t2);
                                                                            await relaunch();
                                                                        }}
                                                                        variant={'default'}
                                                                        size="sm"
                                                                    >
                                                                        Reiniciar ahora
                                                                    </Button>
                                                                </CustomToastActions>
                                                            </CustomToast>
                                                        ),
                                                        { id: installingToast, duration: Infinity }
                                                    );
                                                }
                                            });
                                        } catch (e) {
                                            toast.error(`Error al actualizar: ${e}`, { id: installingToast });
                                        }
                                    }}
                                    variant="default"
                                    size="sm"
                                >
                                    Actualizar
                                </Button>
                            </CustomToastActions>
                        </CustomToast>
                    ),
                    { duration: Infinity }
                );
            }
        } catch (e) {
            console.error('Error checking for updates:', e);
        }
    }

    // El componente Dialog que el consumidor del hook deberá renderizar
    const UpdaterDialog = () => (
        <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
            <DialogContent className="max-w-2xl! w-full">
                <DialogHeader>
                    <DialogTitle>Notas de la versión</DialogTitle>
                    <DialogDescription>Descubre qué hay de nuevo en esta actualización</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(100vh-16rem)]">
                    <Streamdown>{notesContent}</Streamdown>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );

    return { appVersion, checkForUpdates, UpdaterDialog };
};

export { useUpdater };
