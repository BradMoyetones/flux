import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider"
import "./styles/index.css";
import { RouterProvider } from "react-router";
import router from "./router";
import { Toaster } from "./components/ui/sonner";
import { useUpdater } from "./hooks/use-updater";

function UpdaterComponent() {
  const { UpdaterDialog, checkForUpdates } = useUpdater();

  useEffect(() => {
    checkForUpdates();
  }, []);

  return <UpdaterDialog />;
}

function FloatVersionComponent() {
  const { appVersion } = useUpdater();
  return (
    <div className="fixed bottom-2 right-2 z-50">
      <p className="text-muted-foreground text-sm">v{appVersion}</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
    >
      <RouterProvider router={router} />
      <Toaster />

      {/* Componentes de utilidad en segundo plano */}
      <UpdaterComponent />
      <FloatVersionComponent />
    </ThemeProvider>
  </React.StrictMode>,
);
