import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./registerSW";

// Register service worker for PWA (Phase 2.3 - Browser Caching)
// Manual implementation for Vite 7 compatibility
registerServiceWorker({
  onSuccess: (registration) => {
    console.log("[PWA] Service worker active:", registration.scope);
  },
  onUpdate: () => {
    console.log("[PWA] New version available");
    // Update notification is handled by registerSW module
  },
  onError: (error) => {
    console.error("[PWA] Service worker error:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
