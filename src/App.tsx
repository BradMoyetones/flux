import { Edit, Workflow } from "lucide-react";
import { Button } from "./components/ui/button";

function App() {
    return (
        <main className="layout">
            <aside data-tauri-drag-region className="sidebar border-r shadow-2xl flex flex-col">
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
                        <Button variant={"outline"} size={"sm"}>
                            <Edit />
                            <span>Create New Flow</span>
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default App;