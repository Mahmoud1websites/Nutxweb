import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { StoreProvider } from "./app/store";
import { LanguageProvider } from "./app/i18n/LanguageContext";
import { Toaster } from "sonner";
import { router } from "./app/routes";

const __stylesLink = document.createElement("link");
__stylesLink.rel = "stylesheet";
__stylesLink.href = new URL("./styles/index.css", import.meta.url).href;
document.head.appendChild(__stylesLink);

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