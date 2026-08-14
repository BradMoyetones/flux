import { TabsProvider } from '@/shared/contexts/tabs-context';
import { Titlebar } from '@/components/layout/titlebar';
import { Workspace } from '@/components/layout/workspace';
import { useUserStore } from '@/shared/stores/user-store';
import { Navigate } from 'react-router';
import './App.css';

function App() {
    const { isFirstTime } = useUserStore();
    
    if(isFirstTime) return <Navigate to="/onboarding" />
    
    return (
        <div className="app-shell select-none cursor-default">
            <TabsProvider>
                <Titlebar />
                <main className="relative flex-1 overflow-auto h-full w-full">
                    <Workspace />
                </main>
            </TabsProvider>
        </div>
    );
}

export default App;
