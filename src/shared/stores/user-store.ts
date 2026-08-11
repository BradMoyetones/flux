import { create } from 'zustand';
import { LazyStore } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

const store = new LazyStore('user-settings.json');

interface UserState {
    isFirstTime: boolean;
    userName: string;
    theme: string;
    avatarPath: string;
    runInBackground: boolean;
    
    // Actions
    setIsFirstTime: (val: boolean) => Promise<void>;
    setUserName: (val: string) => Promise<void>;
    setTheme: (val: string) => Promise<void>;
    setAvatarPath: (val: string) => Promise<void>;
    setRunInBackground: (val: boolean) => Promise<void>;
    initStore: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
    isFirstTime: true,
    userName: '',
    theme: 'system',
    avatarPath: '',
    runInBackground: true,
    
    setIsFirstTime: async (val) => {
        await store.set('isFirstTime', val);
        await store.save();
        set({ isFirstTime: val });
    },
    setUserName: async (val) => {
        await store.set('userName', val);
        await store.save();
        set({ userName: val });
    },
    setTheme: async (val) => {
        await store.set('theme', val);
        await store.save();
        set({ theme: val });
    },
    setAvatarPath: async (val) => {
        await store.set('avatarPath', val);
        await store.save();
        set({ avatarPath: val });
    },
    setRunInBackground: async (val) => {
        const enabled = !!val;
        await store.set('runInBackground', enabled);
        await store.save();
        await invoke('set_run_in_background', { enabled }).catch(console.error);
        set({ runInBackground: enabled });
    },
    initStore: async () => {
        const isFirstTime = await store.get<boolean>('isFirstTime');
        const userName = await store.get<string>('userName');
        const theme = await store.get<string>('theme');
        const avatarPath = await store.get<string>('avatarPath');
        const runInBackground = await store.get<boolean>('runInBackground');
        
        if (isFirstTime !== null) set({ isFirstTime });
        if (userName !== null) set({ userName });
        if (theme !== null) set({ theme });
        if (avatarPath !== null) set({ avatarPath });
        if (runInBackground !== null && runInBackground !== undefined) {
            const enabled = !!runInBackground;
            set({ runInBackground: enabled });
            await invoke('set_run_in_background', { enabled }).catch(console.error);
        }
    }
}));

