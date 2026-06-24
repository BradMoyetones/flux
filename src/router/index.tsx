import App from "@/app";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createBrowserRouter, Link } from "react-router";


const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
    },
    {
        path: "/flow/new",
        element: <div className="flex flex-col items-center justify-center h-screen w-screen bg-background">
            <span className="text-xl font-bold">
                Flow Editor
            </span>
            <Link to={"/"}>
                <Button variant={"outline"}>
                    <ArrowLeft /> Back
                </Button>
            </Link>
        </div>,
    }
]);

export default router;