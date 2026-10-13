import { create } from 'zustand';
import { api, CONFIG_CHANGED_EVENT, type AppConfig, type ConfigPatch, type NotificationConfig } from '@flux/api';

/**
 * Espejo en el frontend de la configuración del backend.
 *
 * La fuente de verdad es Rust (`ConfigService`). Este store:
 *   - lee con `api.config.getConfig()` y se mantiene sincronizado con `config://changed`;
 *   - escribe SOLO con `api.config.patchConfig()` (nunca abre `user-settings.json`).
 *
 * Los setters aplican el cambio de forma optimista y lo revierten si el backend lo rechaza.
 */

type ConfigFields = Pick<
    AppConfig,
    'isFirstTime' | 'userName' | 'theme' | 'avatarPath' | 'runInBackground' | 'autostart' | 'timezone' | 'notifications'
>;

const pickFields = (c: AppConfig): ConfigFields => ({
    isFirstTime: c.isFirstTime,
    userName: c.userName,
    theme: c.theme,
    avatarPath: c.avatarPath,
    runInBackground: c.runInBackground,
    autostart: c.autostart,
    timezone: c.timezone,
    notifications: c.notifications,
});

const DEFAULT_NOTIFICATIONS: NotificationConfig = {
    desktopEnabled: true,
    onFlowSuccess: true,
    onFlowError: true,
    onSessionDisconnect: true,
    sound: true,
    quietHours: false,
    onlyWhenUnfocused: true,
};

interface UserState extends ConfigFields {
    // Flag la terminacion del Onboarding
    finishOnboarding: boolean;
    setFinishOnboarding: (val: boolean) => void;

    // Actions
    setIsFirstTime: (val: boolean) => Promise<void>;
    setUserName: (val: string) => Promise<void>;
    setTheme: (val: string) => Promise<void>;
    setAvatarPath: (val: string) => Promise<void>;
    setRunInBackground: (val: boolean) => Promise<void>;
    setAutostart: (val: boolean) => Promise<void>;
    setTimezone: (val: string) => Promise<void>;
    updateNotificationConfig: (partial: Partial<NotificationConfig>) => Promise<void>;
    uploadAvatar: () => Promise<void>;
    initStore: () => Promise<void>;
}

let listening = false;

export const useUserStore = create<UserState>((set, get) => {
    /** Optimista + backend como árbitro final; revierte si el backend rechaza el cambio. */
    const patch = async (partial: ConfigPatch & Partial<ConfigFields>) => {
        const keys = Object.keys(partial) as (keyof ConfigFields)[];
        const previous = Object.fromEntries(keys.map((k) => [k, get()[k]]));
        set(partial as Partial<UserState>);
        try {
            const next = await api.config.patchConfig(partial);
            set(pickFields(next));
        } catch (error) {
            console.error('No se pudo guardar la configuración:', error);
            set(previous as Partial<UserState>);
        }
    };

    return {
        isFirstTime: true,
        userName: '',
        theme: 'system',
        avatarPath: '',
        runInBackground: true,
        autostart: true,
        timezone: 'America/Bogota',
        notifications: { ...DEFAULT_NOTIFICATIONS },

        finishOnboarding: false,
        setFinishOnboarding: (val) => set({ finishOnboarding: val }),

        setIsFirstTime: (val) => patch({ isFirstTime: val }),
        setUserName: (val) => patch({ userName: val }),
        setTheme: (val) => patch({ theme: val }),
        setAvatarPath: (val) => patch({ avatarPath: val }),
        setRunInBackground: (val) => patch({ runInBackground: !!val }),
        setAutostart: (val) => patch({ autostart: !!val }),
        setTimezone: (val) => patch({ timezone: val }),
        updateNotificationConfig: (partial) =>
            patch({ notifications: { ...get().notifications, ...partial } }),

        uploadAvatar: async () => {
            try {
                const selected = await api.dialog.open({
                    multiple: false,
                    filters: [{
                        name: 'Image',
                        extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp', 'heic', 'heif'],
                    }],
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
            set(pickFields(await api.config.getConfig()));

            if (!listening) {
                listening = true;
                await api.events.listen<AppConfig>(CONFIG_CHANGED_EVENT, (event) => {
                    set(pickFields(event.payload));
                });
            }
        },
    };
});
