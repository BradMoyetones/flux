import App from '@/modules/app/react/App';
import { Button } from '@/ui/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { createBrowserRouter, Link } from 'react-router';
import { toRouteObjects } from './tab-routes';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: toRouteObjects() as any, // Cast if necessary depending on type compatibility
    },
    {
        path: '/flow/new',
        element: (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-background">
                <span className="text-xl font-bold">Flow Editor</span>
                <Link to={'/'}>
                    <Button variant={'outline'}>
                        <ArrowLeft /> Back
                    </Button>
                </Link>
            </div>
        ),
    },
]);

export default router;
