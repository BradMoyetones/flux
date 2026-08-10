'use client';

import { memo } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';

interface HomeHeaderProps {
    title: string;
    subtitle: string;
    onNewFlow: () => void;
}

/** Compact titlebar-style header, in the spirit of a native desktop window. */
export const HomeHeader = memo(function HomeHeader({ title, subtitle, onNewFlow }: HomeHeaderProps) {
    return (
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border/60 px-4">
            <div className="flex min-w-0 items-baseline gap-2.5">
                <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
                <p className="truncate text-[11px] text-muted-foreground" title={subtitle}>
                    {subtitle}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                            <RefreshCw />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                <Button size="sm" onClick={onNewFlow}>
                    <Plus />
                    Nuevo flujo
                </Button>
            </div>
        </header>
    );
});
