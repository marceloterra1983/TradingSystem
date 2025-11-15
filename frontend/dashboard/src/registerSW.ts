/**
 * Service Worker Registration Module
 * Handles SW lifecycle: registration, updates, and unregistration
 */

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(
  config: ServiceWorkerConfig = {},
): Promise<void> {
  // Only register in production and if browser supports SW
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) {
    console.log("[SW Registration] Skipped:", {
      isDev: import.meta.env.DEV,
      supportsServiceWorker: "serviceWorker" in navigator,
    });
    return;
  }

  try {
    // Wait for page to load before registering
    await new Promise<void>((resolve) => {
      if (document.readyState === "complete") {
        resolve();
      } else {
        window.addEventListener("load", () => resolve());
      }
    });

    console.log("[SW Registration] Registering service worker...");

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none", // Always check for updates
    });

    console.log(
      "[SW Registration] Service worker registered:",
      registration.scope,
    );

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      if (!newWorker) return;

      console.log("[SW Registration] New service worker found, installing...");

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // New service worker available
          console.log(
            "[SW Registration] New service worker installed, update available",
          );

          if (config.onUpdate) {
            config.onUpdate(registration);
          } else {
            // Default behavior: notify user about update
            notifyUpdate(registration);
          }
        } else if (newWorker.state === "activated") {
          console.log("[SW Registration] Service worker activated");

          if (config.onSuccess) {
            config.onSuccess(registration);
          }
        }
      });
    });

    // Check for updates every hour
    setInterval(
      () => {
        console.log("[SW Registration] Checking for updates...");
        registration.update();
      },
      60 * 60 * 1000,
    );

    // Initial success callback
    if (registration.active && config.onSuccess) {
      config.onSuccess(registration);
    }
  } catch (error) {
    console.error("[SW Registration] Registration failed:", error);

    if (config.onError) {
      config.onError(error as Error);
    }
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      const success = await registration.unregister();
      console.log("[SW Registration] Service worker unregistered:", success);
      return success;
    }

    return false;
  } catch (error) {
    console.error("[SW Registration] Unregistration failed:", error);
    return false;
  }
}

/**
 * Check if service worker is registered
 */
export async function isServiceWorkerRegistered(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  return !!registration;
}

/**
 * Get service worker version
 */
export async function getServiceWorkerVersion(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return null;
  }

  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve(null);
      return;
    }

    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.version || null);
    };

    navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" }, [
      messageChannel.port2,
    ]);

    // Timeout after 2 seconds
    setTimeout(() => resolve(null), 2000);
  });
}

/**
 * Notify user about available update
 */
function notifyUpdate(registration: ServiceWorkerRegistration): void {
  const updateBanner = document.createElement("div");
  updateBanner.id = "sw-update-banner";
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1e293b;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="font-weight: 600; margin-bottom: 8px;">
        Nova versão disponível! 🎉
      </div>
      <div style="font-size: 14px; margin-bottom: 12px; opacity: 0.9;">
        Uma nova versão do dashboard está pronta. Recarregue para atualizar.
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="sw-update-reload" style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        ">
          Recarregar
        </button>
        <button id="sw-update-dismiss" style="
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">
          Depois
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(updateBanner);

  // Reload button
  document.getElementById("sw-update-reload")?.addEventListener("click", () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  });

  // Dismiss button
  document
    .getElementById("sw-update-dismiss")
    ?.addEventListener("click", () => {
      updateBanner.remove();
    });
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipWaiting(): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
  }
}
