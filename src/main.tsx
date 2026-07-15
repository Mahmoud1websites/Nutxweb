import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { StoreProvider } from "./app/store";
import { LanguageProvider } from "./app/i18n/LanguageContext";
import { Toaster } from "sonner";
import { router } from "./app/routes";
import "./styles/index.css";   // ← add this




createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <StoreProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          style={{ zIndex: 99999 }}
          toastOptions={{
            style: {
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            },
          }}
        />
      </StoreProvider>
    </LanguageProvider>
  </StrictMode>
);