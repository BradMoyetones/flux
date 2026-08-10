'use client';

import { FolderOpen, Plus, Search } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/ui/components/ui/empty';
import { useHomeStore } from '../../stores/home-store';

export function HomeEmptyState({ query }: { query: string }) {
    const searching = query.trim().length > 0;
    const openCreateDialog = useHomeStore((state) => state.openCreateDialog);
    const selected = useHomeStore((state) => state.selected);

    return (
        <Empty className="mt-8 border border-dashed border-border py-14">
            <EmptyHeader>
                <EmptyMedia variant="icon">{searching ? <Search /> : <FolderOpen />}</EmptyMedia>
                <EmptyTitle>{searching ? 'Sin resultados' : 'Carpeta vacía'}</EmptyTitle>
                <EmptyDescription>
                    {searching
                        ? `No hay flujos que coincidan con “${query}”.`
                        : 'Crea un flujo para empezar a automatizar en esta carpeta.'}
                </EmptyDescription>
            </EmptyHeader>
            {!searching && (
                <Button size="sm" onClick={() => openCreateDialog(selected ?? undefined)}>
                    <Plus />
                    Nuevo flujo
                </Button>
            )}
        </Empty>
    );
}
