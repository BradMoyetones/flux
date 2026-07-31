import { TabsProvider } from '@/shared/contexts/tabs-context';
import { Workspace } from '@/ui/components/layout/workspace';

function App() {
    return (
        <TabsProvider>
            <Workspace />
        </TabsProvider>
    );
}

export default App;
