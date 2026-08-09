import React, { createContext, useContext, useEffect, useState } from 'react';
import { ColorTheme } from '../utils/themes';


interface ColorThemeContextProps {
    colorTheme: ColorTheme;
    setColorTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextProps | undefined>(undefined);

export function ColorThemeProvider({
    children,
    defaultTheme = '',
    storageKey = 'flux-color-theme',
}: {
    children: React.ReactNode;
    defaultTheme?: ColorTheme;
    storageKey?: string;
}) {
    const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
        try {
            const storedTheme = localStorage.getItem(storageKey) as ColorTheme | null;
            return storedTheme || defaultTheme;
        } catch {
            return defaultTheme;
        }
    });

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove existing data-theme
        root.removeAttribute('data-theme');

        // Apply new data-theme if valid
        if (colorTheme) {
            root.setAttribute('data-theme', colorTheme);
        }
    }, [colorTheme]);

    const value = {
        colorTheme,
        setColorTheme: (theme: ColorTheme) => {
            try {
                localStorage.setItem(storageKey, theme);
            } catch (e) {
                // Ignore storage errors
            }
            setColorTheme(theme);
        },
    };

    return (
        <ColorThemeContext.Provider value={value}>
            {children}
        </ColorThemeContext.Provider>
    );
}

export function useColorTheme() {
    const context = useContext(ColorThemeContext);

    if (context === undefined) {
        throw new Error('useColorTheme must be used within a ColorThemeProvider');
    }

    return context;
}
