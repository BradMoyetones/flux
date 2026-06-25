import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider"
import "./styles/index.css";
import { RouterProvider } from "react-router";
import router from "./router";
import { Toaster } from "./components/ui/sonner";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
    >
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </React.StrictMode>,
);
