import { useEffect, ReactNode } from 'react';
import { Calendar, Code2, Sparkles } from 'lucide-react';
import { Streamdown } from 'streamdown';

import { APP_CONFIG } from '@/shared/config/app';
import { cn } from '@/shared/utils/utils';
import { useReleaseNotesViewModel, generateSlug } from '../viewModels/useReleaseNotes.viewModel';

// Helper to extract text from ReactNode children to generate slug
const extractText = (children: ReactNode): string => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(extractText).join('');
    return '';
};

export function ReleaseNotes() {
    const { state, handlers } = useReleaseNotesViewModel();
    const { isLoading, attributes, body, toc, activeId } = state;

    // Intersection Observer for TOC highlighting
    useEffect(() => {
        if (toc.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        handlers.setActiveId(entry.target.id);
                    }
                }
            },
            { rootMargin: '0px 0px -80% 0px' }
        );

        for (const item of toc) {
            const element = document.getElementById(item.id);
            if (element) {
                observer.observe(element);
            }
        }

        return () => {
            for (const item of toc) {
                const element = document.getElementById(item.id);
                if (element) {
                    observer.unobserve(element);
                }
            }
        };
    }, [toc, handlers]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Cargando notas de la versión...</p>
            </div>
        );
    }

    const versionTitle = attributes.title || 'Actualización de Flux';
    const releaseDate = attributes.date;
    const sourceLink = attributes.tag ? APP_CONFIG.getReleaseUrl(attributes.tag) : null;

    return (
        <div className="app-scroll relative h-full overflow-y-auto">
            <div className="mx-auto flex w-full max-w-5xl px-6 py-12 lg:px-8">
                {/* Main Content Area */}
                <article className="mx-auto w-full max-w-2xl shrink-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Sparkles className="size-4" />
                        Notas de la versión
                    </div>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">{versionTitle}</h1>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {releaseDate && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="size-4" />
                                {releaseDate}
                            </div>
                        )}
                        {sourceLink && (
                            <a
                                href={sourceLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                            >
                                <Code2 className="size-4" />
                                Source code
                            </a>
                        )}
                    </div>

                    <hr className="my-8 border-border" />

                    {/* Markdown Body using Streamdown */}
                    <div className="prose prose-sm dark:prose-invert prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary max-w-none text-[15px] leading-relaxed">
                        <Streamdown
                            components={{
                                h2: (props) => {
                                    const text = extractText(props.children);
                                    const id = generateSlug(text);
                                    return (
                                        <h2
                                            id={id}
                                            className="scroll-m-12 border-b border-border/50 pb-2 mt-10 mb-4 text-xl font-semibold text-foreground tracking-tight"
                                            {...props}
                                        />
                                    );
                                },
                                h3: (props) => {
                                    const text = extractText(props.children);
                                    const id = generateSlug(text);
                                    return (
                                        <h3
                                            id={id}
                                            className="scroll-m-12 mt-8 mb-3 text-lg font-medium text-foreground tracking-tight"
                                            {...props}
                                        />
                                    );
                                },
                                ul: (props) => <ul className="mt-4 flex flex-col gap-3 list-none pl-0" {...props} />,
                                li: (props) => (
                                    <li className="flex gap-3 m-0" {...props}>
                                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                                        <span className="text-pretty flex-1">{props.children}</span>
                                    </li>
                                ),
                            }}
                        >
                            {body}
                        </Streamdown>
                    </div>

                    <hr className="my-10 border-border" />

                    <p className="text-sm text-muted-foreground text-pretty">
                        ¿Tienes comentarios? Comparte tus ideas en el repositorio del proyecto o únete a la conversación
                        en la comunidad. Gracias por usar Flux.
                    </p>
                </article>

                {/* Right Sidebar: Table of Contents (Sticky) */}
                {toc.length > 0 && (
                    <aside className="hidden lg:block w-56 shrink-0 pl-10">
                        <div className="sticky top-12 flex flex-col gap-1 border-l border-border/50 pl-4">
                            <p className="mb-2 text-sm font-medium text-foreground">En esta página</p>
                            {toc.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className={cn(
                                        'block py-1 text-sm transition-colors hover:text-foreground',
                                        item.isSub ? 'pl-3' : '',
                                        activeId === item.id ? 'font-medium text-primary' : 'text-muted-foreground'
                                    )}
                                >
                                    {item.text}
                                </a>
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
