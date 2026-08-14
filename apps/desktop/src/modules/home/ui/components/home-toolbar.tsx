'use client';

import { memo, useEffect, useRef } from 'react';
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
import { useHomeStore, ViewMode } from '../../stores/home-store';

export const HomeToolbar = memo(function HomeToolbar() {
    const query = useHomeStore((state) => state.query);
    const setQuery = useHomeStore((state) => state.setQuery);
    const sort = useHomeStore((state) => state.sort);
    const setSort = useHomeStore((state) => state.setSort);
    const view = useHomeStore((state) => state.view);
    const setView = useHomeStore((state) => state.setView);
    
    const searchRef = useRef<HTMLInputElement>(null);

    // Keyboard: "/" or Cmd/Ctrl+K focuses search.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
            if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-2">
            <div className="relative w-full max-w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar flujos…"
                    aria-label="Buscar flujo"
                    className="pr-8 pl-8"
                />
                {query ? (
                    <Button
                        type="button"
                        variant={"ghost"}
                        size={"icon-xs"}
                        onClick={() => setQuery('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute top-1 right-1"
                    >
                        <X className="size-3" />
                    </Button>
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
                        <DropdownMenuItem onClick={() => setSort('recent')}>
                            Recientes
                            {sort === 'recent' && <Check className="ml-auto" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSort('name')}>
                            Nombre
                            {sort === 'name' && <Check className="ml-auto" />}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
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
