'use client';

import { Database, Maximize, Minus, Plus, Send, Webhook } from 'lucide-react';

import { FlowNode } from '@/modules/flows/ui/components/flow-node';

/**
 * Static simulation of a node canvas (à la React Flow). Nodes are absolutely
 * positioned and the connections between them are hand-drawn SVG bezier paths.
 * No drag/zoom logic — this is purely the visual shell to drop real logic into.
 */
export function FlowCanvas() {
    return (
        <div className="dot-grid relative h-full overflow-hidden">
            {/* Connections layer (drawn behind the nodes) */}
            <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
                <defs>
                    <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
                    </marker>
                </defs>

                {/* Webhook -> Database */}
                <path
                    d="M 336 192 C 420 192, 420 332, 504 332"
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={2}
                    markerEnd="url(#arrow)"
                />
                {/* Database -> Action */}
                <path
                    d="M 768 332 C 852 332, 852 192, 936 192"
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={2}
                    markerEnd="url(#arrow)"
                />
            </svg>

            {/* Nodes layer */}
            <div className="absolute inset-0">
                <FlowNode
                    style={{ left: 72, top: 120 }}
                    className="absolute"
                    accent="webhook"
                    icon={Webhook}
                    kind="Trigger"
                    title="Webhook Entrante"
                    subtitle="Se dispara cuando llega un nuevo lead desde el formulario."
                    fields={[
                        { label: 'Método', value: 'POST' },
                        { label: 'Ruta', value: '/leads' },
                    ]}
                    hasOutput
                />

                <FlowNode
                    style={{ left: 504, top: 260 }}
                    className="absolute"
                    accent="database"
                    icon={Database}
                    kind="Acción"
                    title="Guardar en Postgres"
                    subtitle="Inserta el lead en la tabla de contactos del CRM."
                    fields={[
                        { label: 'Tabla', value: 'contacts' },
                        { label: 'Modo', value: 'upsert' },
                    ]}
                    hasInput
                    hasOutput
                />

                <FlowNode
                    style={{ left: 936, top: 120 }}
                    className="absolute"
                    accent="action"
                    icon={Send}
                    kind="Notificación"
                    title="Enviar Email"
                    subtitle="Envía un correo de bienvenida con la plantilla de ventas."
                    fields={[
                        { label: 'Plantilla', value: 'welcome' },
                        { label: 'Delay', value: '0s' },
                    ]}
                    hasInput
                />
            </div>

            {/* Floating canvas controls (decorative) */}
            <div className="absolute bottom-5 left-5 flex flex-col overflow-hidden rounded-lg border border-border bg-card/90 shadow-md backdrop-blur">
                <CanvasButton label="Acercar">
                    <Plus className="size-4" />
                </CanvasButton>
                <span className="h-px bg-border" />
                <CanvasButton label="Alejar">
                    <Minus className="size-4" />
                </CanvasButton>
                <span className="h-px bg-border" />
                <CanvasButton label="Ajustar a la vista">
                    <Maximize className="size-4" />
                </CanvasButton>
            </div>

            <div className="absolute bottom-5 right-5 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur">
                3 nodos · 2 conexiones
            </div>
        </div>
    );
}

function CanvasButton({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <button
            type="button"
            aria-label={label}
            className="grid size-9 place-items-center text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
            {children}
        </button>
    );
}
