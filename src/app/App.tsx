import { Toaster } from "sonner";
import { RouterProvider } from "react-router";
import { StoreProvider } from "./store";
import { router } from "./routes";

export default function App() {
  return (
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
  );
}