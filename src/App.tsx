import { Edit, Settings } from "lucide-react";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";

type Note = {
    id: number;
    title: string;
    content: string;
    created_at: string;
}

const testNotes: Note[] = [
    {
        id: 1,
        title: "Mis quejas de hoy",
        content: "Hoy me levanté temprano y mi café estaba frío. Además, el tráfico estaba horrible.",
        created_at: "2024-06-10T13:47:11-05:00",
    },
    {
        id: 2,
        title: "Compras semanales",
        content: "Leche, huevos, pan, carne, frutas, verduras.",
        created_at: "2024-06-10T13:47:11-05:00",
    },
    {
        id: 3,
        title: "Citas médicas",
        content: "Doctor a las 3 PM, dentista a las 5 PM.",
        created_at: "2024-06-10T13:47:11-05:00",
    },
    {
        id: 4,
        title: "Ideas para el fin de semana",
        content: "Ir al cine, visitar a mis padres, salir a cenar.",
        created_at: "2024-06-10T13:47:11-05:00",
    },
    {
        id: 5,
        title: "Cosas que quiero aprender",
        content: "Aprender a tocar guitarra, aprender a cocinar, aprender a programar.",
        created_at: "2024-06-10T13:47:11-05:00",
    },
]

function App() {

    // Lo modificaré y haré que devuelva ultimos 7 dias, ultimos 30 dias, abril y asi etc etc usando date-fns
    const groupedNotes = testNotes.reduce((acc, note) => {
        const date = new Date(note.created_at);
        const day = format(date, "EEEE");
        if (!acc[day]) {
            acc[day] = [];
        }
        acc[day].push(note);
        return acc;
    }, {} as Record<string, Note[]>)

    return (
        <main className="layout">
            <aside data-tauri-drag-region className="sidebar border-r shadow-2xl flex flex-col">
                <div className="px-2">
                    <div data-tauri-drag-region className="py-1.5 flex justify-end">
                        <Button variant={"outline"} size={"icon-sm"}>
                            <Edit />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(groupedNotes).map(([day, notes]) => (
                            <div key={day} className="space-y-2">
                                <DateSeparator>{day}</DateSeparator>
                                <div className="pl-2 space-y-2">
                                    {notes.map((note) => (
                                        <NoteItem key={note.id}>
                                            <NoteTitle>{note.title}</NoteTitle>
                                            <NoteDescription>{note.content}</NoteDescription>
                                        </NoteItem>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1"></div>
                <div className="sticky bottom-0 border-t w-full p-2 bg-card/30 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <Avatar>
                            <AvatarImage src="https://github.com/shadcn.png" />
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-sm">Brad Moyetones</h1>
                            <p className="text-xs text-muted-foreground">@itsbrad</p>
                        </div>
                        <div className="ml-auto">
                            <Button variant={"outline"} size={"icon-sm"}>
                                <Settings />
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>
            <section className="content bg-card/80">contenido</section>
        </main>
    );
}

export default App;

const NoteItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            {...props}
            className={cn("group w-full p-2 rounded-lg border bg-card/50 hover:bg-card transition-all", className)}
        />
    );
};

const NoteTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
        <h1
            {...props}
            className={cn("text-sm truncate font-semibold", className)}
        />
    );
}

const NoteDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
    return (
        <p
            {...props}
            className={cn("text-xs truncate text-muted-foreground", className)}
        />
    );
}

const DateSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            {...props}
            className={cn("border-b font-bold text-muted-foreground px-1", className)}
        />
    );
}