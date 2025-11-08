const isBrowserEnvironment =
  typeof window !== "undefined" && typeof document !== "undefined";

export const isBrowser = isBrowserEnvironment;

export function safeLocalStorageGet(key: string): string | null {
  if (!isBrowserEnvironment) {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(
      "[safeStorage] Failed to read key from localStorage:",
      key,
      error,
    );
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): void {
  if (!isBrowserEnvironment) {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(
      "[safeStorage] Failed to persist key to localStorage:",
      key,
      error,
    );
  }
}

export function safeLocalStorageRemove(key: string): void {
  if (!isBrowserEnvironment) {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(
      "[safeStorage] Failed to remove key from localStorage:",
      key,
      error,
    );
  }
}

export function safeDispatchEvent<T>(eventName: string, detail?: T): void {
  if (!isBrowserEnvironment) {
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch (error) {
    console.warn(
      "[safeDispatchEvent] Failed to dispatch event:",
      eventName,
      error,
    );
  }
}
