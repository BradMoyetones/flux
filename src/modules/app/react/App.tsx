import { TabsProvider } from '@/shared/contexts/tabs-context';
import { Titlebar } from '@/ui/components/layout/titlebar';
import { Workspace } from '@/ui/components/layout/workspace';
import { OnboardingView } from '@/modules/onboarding/OnboardingView';
import './App.css';

function App() {
    return (
        <div className="app-shell select-none cursor-default">
            <TabsProvider>
                <Titlebar />
                <main className="relative flex-1 overflow-auto h-full w-full">
                    <Workspace />
                </main>
            </TabsProvider>
            
            <OnboardingView />
        </div>
    );
}

export default App;
