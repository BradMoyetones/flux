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
import { Navigate } from 'react-router';
import { WindowControls } from '@/ui/components/layout/window-controls';

export function OnboardingView() {
    const { isFirstTime, setIsFirstTime, userName, setUserName, avatarPath, setAvatarPath, runInBackground, setRunInBackground, uploadAvatar } = useUserStore();
    const { theme, setTheme } = useTheme();
    
    const [step, setStep] = useState(1);
    const [localName, setLocalName] = useState(userName || '');

    if (!isFirstTime) return <Navigate to="/" />;

    const finishOnboarding = async () => {
        await setUserName(localName);
        await setIsFirstTime(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-8 select-none cursor-default">
            <header data-tauri-drag-region className='h-10 fixed top-0 w-full z-50 flex justify-end'>
                <WindowControls />
            </header>
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                {step === 1 && (
                    <div className="text-center space-y-6">
                        <img 
                            src="/app-icon.svg" 
                            alt="" 
                            className="w-36 mx-auto"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                        />
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
                            <div className="relative group cursor-pointer transition-all hover:scale-105" onClick={uploadAvatar}>
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

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" size="lg" onClick={() => setStep(1)} >Atrás</Button>
                            <Button size="lg" onClick={() => setStep(3)}  disabled={!localName.trim()}>Siguiente</Button>
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
                                <Sun /> Claro
                            </Button>
                            <Button 
                                variant={theme === 'dark' ? 'default' : 'outline'} 
                                className="h-28 flex flex-col gap-3" 
                                onClick={() => setTheme('dark')}
                            >
                                <Moon /> Oscuro
                            </Button>
                            <Button 
                                variant={theme === 'system' ? 'default' : 'outline'} 
                                className="h-28 flex flex-col gap-3" 
                                onClick={() => setTheme('system')}
                            >
                                <Monitor /> Sistema
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <Button variant="outline" size="lg" onClick={() => setStep(2)}>Atrás</Button>
                            <Button size="lg" onClick={() => setStep(4)}>Siguiente</Button>
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

                        <div className="grid grid-cols-2 gap-4 pt-8">
                            <Button variant="outline" size="lg" onClick={() => setStep(3)}>Atrás</Button>
                            <Button size="lg" onClick={finishOnboarding}>
                                <Check /> Finalizar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
