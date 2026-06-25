import { Edit, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useEffect } from "react";
import { toast } from "sonner";

function App() {
    useEffect(() => {
        checkForUpdates();
    }, []);

    async function checkForUpdates() {
        try {
            const update = await check();
            if (update) {
                toast(`Nueva versión disponible: v${update.version}`, {
                    description: update.body || "Hay mejoras y correcciones disponibles.",
                    duration: Infinity,
                    action: {
                        label: "Actualizar",
                        onClick: async () => {
                            const installingToast = toast.loading("Descargando actualización...");
                            try {
                                await update.downloadAndInstall((event) => {
                                    if (event.event === "Started" && event.data.contentLength) {
                                        toast.loading("Descargando actualización...", {
                                            id: installingToast,
                                        });
                                    } else if (event.event === "Finished") {
                                        toast.success("Actualización lista", {
                                            id: installingToast,
                                            description: "La nueva versión se aplicará al reiniciar.",
                                            duration: Infinity,
                                            action: {
                                                label: "Reiniciar ahora",
                                                onClick: async () => {
                                                    await relaunch();
                                                }
                                            },
                                            cancel: {
                                                label: "Más tarde",
                                                onClick: () => toast.dismiss(installingToast)
                                            }
                                        });
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
            console.error("Error checking for updates:", e);
        }
    }

    return (
        <main className="layout">
            <aside data-tauri-drag-region className="sidebar border-r shadow-2xl flex flex-col bg-background/80">
                <div data-tauri-drag-region className="p-1 flex h-10" />
                <div className="p-2 flex flex-col h-full">
                    <div className="border-2 border-dashed flex-1 h-full rounded-xl border-amber-500/40 flex flex-col items-center justify-center">
                        <div className="p-2 flex flex-col items-center gap-2 text-muted-foreground">
                            No flows yet...
                            <Workflow />
                            <Button variant={"outline"} size={"sm"}>
                                <Edit />
                                <span>Create New Flow</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>
            <section className="content bg-card/80">
                <div className="p-10 flex justify-center items-center h-full">
                    <div className="w-full flex flex-col justify-center items-center gap-4">
                        <h1 className="font-bold text-5xl">Flux</h1>
                        <span className="text-muted-foreground font-medium">Automation and Workflow Orchestration Engine</span>
                        <Link to={"/flow/new"}>
                            <Button variant={"outline"} size={"sm"}>
                                <Edit />
                                <span>Create New Flow</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default App;