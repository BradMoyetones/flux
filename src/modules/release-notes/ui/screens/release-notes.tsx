import { Sparkles } from 'lucide-react';

interface ChangeGroup {
    label: string;
    tone: 'feature' | 'fix' | 'improvement';
    items: string[];
}

const groups: ChangeGroup[] = [
    {
        label: 'Novedades',
        tone: 'feature',
        items: [
            'Nuevo sistema de pestañas estilo navegador con persistencia entre sesiones.',
            'Lienzo de nodos rediseñado con widgets premium y puertos de conexión.',
            'Paleta de comandos global accesible con ⌘K desde cualquier vista.',
        ],
    },
    {
        label: 'Mejoras',
        tone: 'improvement',
        items: [
            'El arranque en frío de la app es ahora un 40% más rápido en Tauri.',
            'Las conexiones entre nodos usan curvas suaves con indicadores de dirección.',
            'Modo oscuro OLED afinado para pantallas de portátiles modernos.',
        ],
    },
    {
        label: 'Correcciones',
        tone: 'fix',
        items: [
            'Se corrigió el cierre de pestañas que a veces enfocaba la pestaña incorrecta.',
            'Se solucionó un parpadeo del lienzo al cambiar entre flujos.',
        ],
    },
];

const toneStyles: Record<ChangeGroup['tone'], string> = {
    feature: 'bg-muted text-primary',
    improvement: 'bg-sky-500/15 text-sky-400',
    fix: 'bg-emerald-500/15 text-emerald-400',
};

export function ReleaseNotes() {
    return (
        <div className="app-scroll h-full overflow-y-auto">
            <article className="mx-auto w-full max-w-2xl px-6 py-12 lg:px-8">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="size-4" />
                    Notas de la versión
                </div>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">Flux v1.0.1</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Publicado el 30 de junio de 2026 · Actualización recomendada
                </p>

                <hr className="my-8 border-border" />

                <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
                    Esta versión se centra en hacer que Flux se sienta como una aplicación de escritorio nativa de
                    primera clase. Reconstruimos el shell de la interfaz desde cero, con un sistema de pestañas y un
                    lienzo de automatización completamente nuevos.
                </p>

                <div className="mt-10 flex flex-col gap-10">
                    {groups.map((group) => (
                        <section key={group.label}>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneStyles[group.tone]}`}
                                >
                                    {group.label}
                                </span>
                                <span className="h-px flex-1 bg-border" />
                            </div>

                            <ul className="mt-4 flex flex-col gap-3">
                                {group.items.map((item) => (
                                    <li
                                        key={item}
                                        className="flex gap-3 text-[15px] leading-relaxed text-foreground/90"
                                    >
                                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                                        <span className="text-pretty">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>

                <hr className="my-10 border-border" />

                <p className="text-sm text-muted-foreground text-pretty">
                    ¿Tienes comentarios? Comparte tus ideas en el repositorio del proyecto o únete a la conversación en
                    la comunidad. Gracias por usar Flux.
                </p>
            </article>
        </div>
    );
}
