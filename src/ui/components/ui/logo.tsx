import { cn } from '@/shared/utils/utils';

export function Logo({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'relative flex size-8 items-center justify-center rounded-lg bg-accent border border-accent-foreground/20 shrink-0',
                className
            )}
        >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
                <circle cx="4" cy="4" r="2" fill="currentColor"></circle>
                <circle cx="12" cy="4" r="2" fill="currentColor" opacity="0.7"></circle>
                <circle cx="8" cy="12" r="2" fill="currentColor" opacity="0.5"></circle>
                <line x1="5.5" y1="5" x2="7" y2="10.5" stroke="currentColor" strokeWidth="1" opacity="0.4"></line>
                <line x1="10.5" y1="5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1" opacity="0.4"></line>
            </svg>
        </div>
    );
}
