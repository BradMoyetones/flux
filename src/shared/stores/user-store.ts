import { create } from 'zustand';
import { LazyStore } from '@tauri-apps/plugin-store';

const store = new LazyStore('user-settings.json');

export interface NotificationConfig {
    desktopEnabled: boolean;
    onFlowSuccess: boolean;
    onFlowError: boolean;
    onSessionDisconnect: boolean;
    sound: boolean;
    quietHours: boolean;
    onlyWhenUnfocused: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationConfig = {
    desktopEnabled: true,
    onFlowSuccess: true,
    onFlowError: true,
    onSessionDisconnect: true,
    sound: true,
    quietHours: false,
    onlyWhenUnfocused: true,
};

interface UserState {
    isFirstTime: boolean;
    userName: string;
    theme: string;
    avatarPath: string;
    runInBackground: boolean;
    notifications: NotificationConfig;
    
    // Actions
    setIsFirstTime: (val: boolean) => Promise<void>;
    setUserName: (val: string) => Promise<void>;
    setTheme: (val: string) => Promise<void>;
    setAvatarPath: (val: string) => Promise<void>;
    setRunInBackground: (val: boolean) => Promise<void>;
    updateNotificationConfig: (partial: Partial<NotificationConfig>) => Promise<void>;
    initStore: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
    isFirstTime: true,
    userName: '',
    theme: 'system',
    avatarPath: '',
    runInBackground: true,
    notifications: { ...DEFAULT_NOTIFICATIONS },
    
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
        set({ runInBackground: enabled });
    },
    updateNotificationConfig: async (partial) => {
        const current = get().notifications;
        const updated = { ...current, ...partial };
        await store.set('notifications', updated);
        await store.save();
        set({ notifications: updated });
    },
    initStore: async () => {
        const isFirstTime = await store.get<boolean>('isFirstTime');
        const userName = await store.get<string>('userName');
        const theme = await store.get<string>('theme');
        const avatarPath = await store.get<string>('avatarPath');
        const runInBackground = await store.get<boolean>('runInBackground');
        const notifications = await store.get<NotificationConfig>('notifications');
        
        if (isFirstTime !== null) set({ isFirstTime });
        if (userName !== null) set({ userName });
        if (theme !== null) set({ theme });
        if (avatarPath !== null) set({ avatarPath });
        if (runInBackground !== null && runInBackground !== undefined) {
            set({ runInBackground: !!runInBackground });
        }
        if (notifications !== null && notifications !== undefined) {
            set({ notifications: { ...DEFAULT_NOTIFICATIONS, ...notifications } });
        }
    }
}));
