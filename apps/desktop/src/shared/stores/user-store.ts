import { create } from 'zustand';
import { api, LazyStore, type NotificationConfig } from '@flux/api';

const store = new LazyStore('user-settings.json');

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

    // Flag la terminacion del Onboarding
    finishOnboarding: boolean;
    setFinishOnboarding: (val: boolean) => void;
    
    // Actions
    setIsFirstTime: (val: boolean) => Promise<void>;
    setUserName: (val: string) => Promise<void>;
    setTheme: (val: string) => Promise<void>;
    setAvatarPath: (val: string) => Promise<void>;
    setRunInBackground: (val: boolean) => Promise<void>;
    updateNotificationConfig: (partial: Partial<NotificationConfig>) => Promise<void>;
    uploadAvatar: () => Promise<void>;
    initStore: () => Promise<void>;
}



export const useUserStore = create<UserState>((set, get) => ({
    isFirstTime: true,
    userName: '',
    theme: 'system',
    avatarPath: '',
    runInBackground: true,
    notifications: { ...DEFAULT_NOTIFICATIONS },

    // Flag la terminacion del Onboarding
    finishOnboarding: false,
    setFinishOnboarding: (val) => {
        set({ finishOnboarding: val });
    },
    
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
    uploadAvatar: async () => {
        try {
            const selected = await api.dialog.open({
                multiple: false,
                filters: [{
                    name: 'Image',
                    extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp', 'heic', 'heif']
                }]
            });
            if (selected) {
                const path = typeof selected === 'string' ? selected : (selected as any).path;
                if (!path) return;

                const newPath = await api.profile.processAndSaveAvatar(path);
                await get().setAvatarPath(newPath);
            }
        } catch (e) {
            console.error('Failed to upload avatar:', e);
        }
    },
    initStore: async () => {
        const isFirstTime = await store.get<boolean>('isFirstTime');
        const userName = await store.get<string>('userName');
        const theme = await store.get<string>('theme');
        const avatarPath = await store.get<string>('avatarPath');
        const runInBackground = await store.get<boolean>('runInBackground');
        const notifications = await store.get<NotificationConfig>('notifications');
        
        if (isFirstTime !== null && isFirstTime !== undefined) set({ isFirstTime });
        if (userName !== null && userName !== undefined) set({ userName });
        if (theme !== null && theme !== undefined) set({ theme });
        if (avatarPath !== null && avatarPath !== undefined) set({ avatarPath });
        if (runInBackground !== null && runInBackground !== undefined) {
            set({ runInBackground: !!runInBackground });
        }
        if (notifications !== null && notifications !== undefined) {
            set({ notifications: { ...DEFAULT_NOTIFICATIONS, ...notifications } });
        }
    }
}));
