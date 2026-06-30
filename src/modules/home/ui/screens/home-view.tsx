'use client';

import { Bell, Database, FileSpreadsheet, Mail, Plus, Search, Webhook, Workflow, type LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils/utils';
import { Button } from '@/ui/components/ui/button';
import { useTabs } from '@/shared/contexts/tabs-context';

interface WorkflowCard {
    title: string;
    description: string;
    icon: LucideIcon;
    active: boolean;
    edited: string;
    /** Route to open when the card is clicked. */
    path?: string;
}

const workflows: WorkflowCard[] = [
    {
        title: 'Flujo de Ventas',
        description: 'Captura leads del webhook y los enruta a tu CRM.',
        icon: Workflow,
        active: true,
        edited: 'hace 2 horas',
        path: '/flows/sales',
    },
    {
        title: 'Onboarding Automático',
        description: 'Da la bienvenida a nuevos usuarios con una secuencia.',
        icon: Database,
        active: true,
        edited: 'ayer',
        path: '/flows/onboarding',
    },
    {
        title: 'Resumen Diario',
        description: 'Agrega métricas y las envía por email cada mañana.',
        icon: Mail,
        active: false,
        edited: 'hace 3 días',
    },
    {
        title: 'Sincronización de Inventario',
        description: 'Mantiene el stock alineado entre tienda y almacén.',
        icon: FileSpreadsheet,
        active: true,
        edited: 'hace 5 días',
    },
    {
        title: 'Alertas de Errores',
        description: 'Notifica al equipo en Slack cuando algo falla.',
        icon: Bell,
        active: false,
        edited: 'la semana pasada',
    },
    {
        title: 'Webhook de Pagos',
        description: 'Concilia pagos entrantes y actualiza facturas.',
        icon: Webhook,
        active: true,
        edited: 'hace 2 semanas',
    },
];

export function HomeView() {
    const { openTab } = useTabs();

    return (
        <div className="app-scroll h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-primary">Workspace</p>
                        <h1 className="text-2xl font-semibold tracking-tight text-balance">Buenas tardes, Alex</h1>
                        <p className="text-sm text-muted-foreground text-pretty">
                            Tienes 4 flujos activos ejecutándose ahora mismo.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative hidden md:block">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="search"
                                placeholder="Buscar flujos…"
                                className="h-9 w-56 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                            />
                        </div>
                        <Button onClick={() => openTab('/flows/sales')}>
                            <Plus data-icon="inline-start" />
                            Nuevo flujo
                        </Button>
                    </div>
                </header>

                <section className="mt-8">
                    <h2 className="mb-3 text-sm font-medium text-muted-foreground">Tus workflows</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <button
                            type="button"
                            onClick={() => openTab('/release-notes/v1.2')}
                            className={cn(
                                'group flex flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition',
                                'cursor-pointer hover:-translate-y-0.5 hover:bg-primary/40 hover:shadow-md'
                            )}
                        >
                            Notas
                        </button>
                        {workflows.map((flow) => {
                            const Icon = flow.icon;
                            const interactive = Boolean(flow.path);
                            return (
                                <button
                                    key={flow.title}
                                    type="button"
                                    disabled={!interactive}
                                    onClick={() => flow.path && openTab(flow.path)}
                                    className={cn(
                                        'group flex flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition',
                                        interactive
                                            ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'
                                            : 'cursor-default opacity-90'
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="grid size-11 place-items-center rounded-lg bg-muted text-primary">
                                            <Icon className="size-5" />
                                        </div>
                                        <StatusBadge active={flow.active} />
                                    </div>

                                    <h3 className="mt-4 font-medium">{flow.title}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground text-pretty">{flow.description}</p>

                                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                                        <span>Editado {flow.edited}</span>
                                        {interactive ? (
                                            <span className="text-primary opacity-0 transition group-hover:opacity-100">
                                                Abrir →
                                            </span>
                                        ) : null}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
            )}
        >
            <span className={cn('size-1.5 rounded-full', active ? 'bg-emerald-400' : 'bg-muted-foreground')} />
            {active ? 'Activo' : 'Inactivo'}
        </span>
    );
}
