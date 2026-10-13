'use client';

import { useEffect, useState } from 'react';
import { relativeTime } from '../../lib/format';

/**
 * Hydration-safe "time ago" text. The value depends on Date.now(), which
 * differs between server render and client hydration, so we recompute it
 * after mount and suppress the expected initial mismatch.
 */
export function RelativeTime({ iso }: { iso: string }) {
    const [text, setText] = useState(() => relativeTime(iso));

    useEffect(() => {
        setText(relativeTime(iso));
    }, [iso]);

    return (
        <time dateTime={iso} suppressHydrationWarning>
            {text}
        </time>
    );
}
