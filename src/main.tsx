import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider"
import "./styles/index.css";
import { RouterProvider } from "react-router";
import router from "./router";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
