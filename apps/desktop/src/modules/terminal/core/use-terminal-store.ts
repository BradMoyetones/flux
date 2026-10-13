import { create } from 'zustand';

interface TerminalState {
  isOpen: boolean;
  fontSize: number;
  theme: 'dark' | 'light';
  
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setFontSize: (size: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  isOpen: false,
  fontSize: 12,
  theme: 'dark',
  
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
  setFontSize: (fontSize) => set({ fontSize }),
  setTheme: (theme) => set({ theme }),
}));
