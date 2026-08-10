import { useState } from 'react';
import { useUserStore } from '@/shared/stores/user-store';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useTheme } from 'next-themes';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { Switch } from '@/ui/components/ui/switch';
import { Upload, Check, Moon, Sun, Monitor } from 'lucide-react';

export function OnboardingView() {
    const { isFirstTime, setIsFirstTime, userName, setUserName, avatarPath, setAvatarPath, runInBackground, setRunInBackground } = useUserStore();
    const { theme, setTheme } = useTheme();
    
    const [step, setStep] = useState(1);
    const [localName, setLocalName] = useState(userName || '');

    if (!isFirstTime) return null;

    const handleAvatarUpload = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Image',
                    extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp']
                }]
            });
            if (selected) {
                const path = typeof selected === 'string' ? selected : (selected as any).path;
                if (!path) return;
                
                const newPath = await invoke<string>('process_and_save_avatar', { filePath: path });
                setAvatarPath(newPath);
            }
        } catch (e) {
            console.error('Failed to upload avatar:', e);
        }
    };

    const finishOnboarding = async () => {
        await setUserName(localName);
        await setIsFirstTime(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-8 select-none">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                {step === 1 && (
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-20 h-20 bg-primary/10 flex items-center justify-center rounded-2xl mb-8">
                            <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">Bienvenido a Flux</h1>
                        <p className="text-muted-foreground text-lg">Tu motor de flujos local-first, rápido y privado.</p>
                        <div className="pt-8">
                            <Button size="lg" onClick={() => setStep(2)} className="w-full text-md h-12">Comenzar</Button>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-bold">Tu Perfil</h2>
                            <p className="text-muted-foreground">Personaliza cómo te ves en Flux</p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer transition-all hover:scale-105" onClick={handleAvatarUpload}>
                                <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center overflow-hidden bg-muted group-hover:border-primary">
                                    {avatarPath ? (
                                        <img src={convertFileSrc(avatarPath)} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                    )}
                                </div>
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Cambiar foto</span>
                            </div>
                        </div>

                        <div className="space-y-3 pt-6">
                            <Label className="text-md">¿Cómo te llamas?</Label>
                            <Input 
                                className="h-12 text-lg" 
                                value={localName} 
                                onChange={(e) => setLocalName(e.target.value)} 
                                placeholder="Ej. Alex" 
                                onKeyDown={(e) => e.key === 'Enter' && localName.trim() && setStep(3)}
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" size="lg" onClick={() => setStep(1)} className="w-full">Atrás</Button>
                            <Button size="lg" onClick={() => setStep(3)} className="w-full" disabled={!localName.trim()}>Siguiente</Button>
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div className="space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-bold">Apariencia</h2>
                            <p className="text-muted-foreground">Elige tu tema preferido</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <Button 
                                variant={theme === 'light' ? 'default' : 'outline'} 
                                className="h-28 flex flex-col gap-3" 
                                onClick={() => setTheme('light')}
                            >
                                <Sun className="w-6 h-6" /> Claro
                            </Button>
                            <Button 
                                variant={theme === 'dark' ? 'default' : 'outline'} 
                                className="h-28 flex flex-col gap-3" 
                                onClick={() => setTheme('dark')}
                            >
                                <Moon className="w-6 h-6" /> Oscuro
                            </Button>
                            <Button 
                                variant={theme === 'system' ? 'default' : 'outline'} 
                                className="h-28 flex flex-col gap-3" 
                                onClick={() => setTheme('system')}
                            >
                                <Monitor className="w-6 h-6" /> Sistema
                            </Button>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" size="lg" onClick={() => setStep(2)} className="w-full">Atrás</Button>
                            <Button size="lg" onClick={() => setStep(4)} className="w-full">Siguiente</Button>
                        </div>
                    </div>
                )}
                {step === 4 && (
                    <div className="space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-bold">Segundo Plano</h2>
                            <p className="text-muted-foreground">Configuración del sistema</p>
                        </div>

                        <div className="flex items-center justify-between space-x-4 border border-border p-6 rounded-xl bg-card">
                            <div className="flex flex-col space-y-2">
                                <Label className="text-base font-semibold cursor-pointer">Ejecutar en Segundo Plano</Label>
                                <span className="font-normal text-sm text-muted-foreground leading-relaxed">
                                    Al cerrar la ventana, la aplicación permanecerá activa en el menú del sistema (System Tray) para procesar tus flujos.
                                </span>
                            </div>
                            <Switch checked={runInBackground} onCheckedChange={setRunInBackground} className="data-[state=checked]:bg-primary" />
                        </div>

                        <div className="flex gap-4 pt-8">
                            <Button variant="outline" size="lg" onClick={() => setStep(3)} className="w-full">Atrás</Button>
                            <Button size="lg" onClick={finishOnboarding} className="w-full gap-2">
                                <Check className="w-4 h-4" /> Finalizar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
