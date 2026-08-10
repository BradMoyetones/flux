'use client';

import { memo, type RefObject } from 'react';
import { ArrowUpDown, Check, LayoutGrid, List, Search, X } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown-menu';
import { Input } from '@/ui/components/ui/input';
import { Kbd } from '@/ui/components/ui/kbd';
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { SortMode, ViewMode } from '../../hooks/use-home-filters';

interface HomeToolbarProps {
    query: string;
    onQueryChange: (q: string) => void;
    searchRef: RefObject<HTMLInputElement | null>;
    sort: SortMode;
    onSortChange: (s: SortMode) => void;
    view: ViewMode;
    onViewChange: (v: ViewMode) => void;
}

export const HomeToolbar = memo(function HomeToolbar({
    query,
    onQueryChange,
    searchRef,
    sort,
    onSortChange,
    view,
    onViewChange,
}: HomeToolbarProps) {
    return (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-2">
            <div className="relative w-full max-w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Buscar flujos…"
                    aria-label="Buscar flujo"
                    className="h-7 rounded-md bg-muted/50 pr-12 pl-8 text-[13px] shadow-none"
                />
                {query ? (
                    <button
                        type="button"
                        onClick={() => onQueryChange('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute top-1/2 right-2 grid size-4.5 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-3" />
                    </button>
                ) : (
                    <Kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
                )}
            </div>

            <div className="flex-1" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <ArrowUpDown />
                        {sort === 'recent' ? 'Recientes' : 'Nombre'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onSortChange('recent')}>
                            Recientes
                            {sort === 'recent' && <Check className="ml-auto" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSortChange('name')}>
                            Nombre
                            {sort === 'name' && <Check className="ml-auto" />}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <Tabs value={view} onValueChange={(v) => onViewChange(v as ViewMode)}>
                <TabsList className="rounded-md">
                    <TabsTrigger value="grid" aria-label="Vista de cuadrícula" className="px-2">
                        <LayoutGrid />
                    </TabsTrigger>
                    <TabsTrigger value="list" aria-label="Vista de lista" className="px-2">
                        <List />
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
});
