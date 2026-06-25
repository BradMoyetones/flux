import { Button } from "@/components/ui/button";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getVersion } from '@tauri-apps/api/app';

const useUpdater = () => {
    const [appVersion, setAppVersion] = useState('');

    useEffect(() => {
        getVersion().then((v) => setAppVersion(v));
    }, []);

    async function checkForUpdates() {
        try {
            const update = await check();
            if (update) {
                toast(`Nueva versión disponible: v${update.version}`, {
                    description: update.body || 'Hay mejoras y correcciones disponibles.',
                    duration: Infinity,
                    classNames: {
                        toast: 'flex flex-col items-start!',
                    },
                    action: {
                        label: 'Actualizar',
                        onClick: async () => {
                            const installingToast = toast.loading('Descargando actualización...');
                            try {
                                await update.downloadAndInstall((event) => {
                                    if (event.event === 'Started' && event.data.contentLength) {
                                        console.log(event.data.contentLength);

                                        toast.loading('Descargando actualización...', {
                                            id: installingToast,
                                        });
                                    } else if (event.event === 'Finished') {
                                        toast.custom(
                                            (t) => (
                                                <li
                                                    className="cn-toast flex flex-col items-start! gap-4!"
                                                    data-sonner-toast=""
                                                    data-styled="true"
                                                    data-mounted="true"
                                                    data-promise="false"
                                                    data-swiped="false"
                                                    data-removed="false"
                                                    data-visible="true"
                                                    data-y-position="bottom"
                                                    data-x-position="right"
                                                    data-index="0"
                                                    data-front="true"
                                                    data-swiping="false"
                                                    data-dismissible="true"
                                                    data-type="success"
                                                    data-swipe-out="false"
                                                    data-expanded="false"
                                                >
                                                    <div className="flex gap-2">
                                                        <div data-icon="" className="">
                                                            <CircleCheck className='size-4' />
                                                        </div>
                                                        <div data-content="" className="">
                                                            <div data-title="" className="">
                                                                Actualización lista
                                                            </div>
                                                            <div data-description="" className="">
                                                                La nueva versión se aplicará al reiniciar.
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 w-fit! ml-auto">
                                                        <Button
                                                            onClick={() => toast.dismiss(t)}
                                                            variant={'secondary'}
                                                            data-button="true"
                                                            data-cancel="true"
                                                            className=""
                                                        >
                                                            Más tarde
                                                        </Button>
                                                        <Button
                                                            onClick={async () => {
                                                                toast.dismiss(t);
                                                                await relaunch();
                                                            }}
                                                            variant={'default'}
                                                            data-button="true"
                                                            data-action="true"
                                                            className=""
                                                        >
                                                            Reiniciar ahora
                                                        </Button>
                                                    </div>

                                                </li>
                                            ),
                                            {
                                                id: installingToast,
                                                duration: Infinity,
                                            }
                                        );
                                    }
                                });
                            } catch (e) {
                                toast.error(`Error al actualizar: ${e}`, {
                                    id: installingToast,
                                });
                            }
                        },
                    },
                });
            }
        } catch (e) {
            console.error('Error checking for updates:', e);
        }
    }

    return { appVersion, checkForUpdates };
}

export { useUpdater };