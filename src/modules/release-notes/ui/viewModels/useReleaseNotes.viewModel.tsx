import { useState, useEffect, useMemo } from 'react';
import frontMatter from 'front-matter';
import { useReleaseNotesStore } from '@/shared/contexts/release-notes-store';
import latestNotesRaw from '@releases/latest.md?raw';

export interface FrontmatterAttributes {
    title?: string;
    version?: string;
    date?: string;
    tag?: string;
}

export interface TocItem {
    id: string;
    text: string;
    isSub: boolean;
}

// Generador de slugs sin estado para evitar desincronización entre TOC y Renderizado
export const generateSlug = (text: string) =>
    text
        .toLowerCase()
        .trim()
        .normalize('NFD') // Normaliza acentos
        .replace(/[\u0300-\u036f]/g, '') // Quita acentos
        .replace(/[^\w\s-]/g, '') // Quita caracteres especiales
        .replace(/[\s_-]+/g, '-') // Reemplaza espacios con guiones
        .replace(/^-+|-+$/g, ''); // Quita guiones iniciales o finales

export const useReleaseNotesViewModel = () => {
    const { pendingNotes } = useReleaseNotesStore();
    const [rawMarkdown, setRawMarkdown] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (pendingNotes) {
            setRawMarkdown(pendingNotes);
        } else {
            setRawMarkdown(latestNotesRaw);
        }
        setIsLoading(false);
    }, [pendingNotes]);

    const { attributes, body, toc } = useMemo<{
        attributes: FrontmatterAttributes;
        body: string;
        toc: TocItem[];
    }>(() => {
        if (!rawMarkdown) return { attributes: {}, body: '', toc: [] };

        let parsed;
        try {
            parsed = frontMatter<FrontmatterAttributes>(rawMarkdown);
        } catch {
            parsed = { attributes: {}, body: rawMarkdown };
        }

        const headings = parsed.body.match(/^#{2,3}\s+(.+)$/gm) || [];

        const extractedToc = headings.map((h) => {
            const isSub = h.startsWith('###');
            const text = h.replace(/^#+\s+/, '').trim();
            return {
                id: generateSlug(text),
                text,
                isSub,
            };
        });

        return { attributes: parsed.attributes, body: parsed.body, toc: extractedToc };
    }, [rawMarkdown]);

    const state = {
        attributes,
        body,
        toc,
        isLoading,
        activeId,
    };

    const handlers = {
        setActiveId,
    };

    return { state, handlers };
};
