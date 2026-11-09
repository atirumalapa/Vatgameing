import { useSyncExternalStore } from "react";

export type Settings = {
  theme: "dark" | "light";
  textSize: "normal" | "large" | "xlarge";
  dyslexiaFont: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  textSize: "normal",
  dyslexiaFont: false,
};

// Same key as the script in index.html that sets the theme before first paint.
const STORAGE_KEY = "vatg-settings";

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyToPage(settings: Settings) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.textSize = settings.textSize;
  root.dataset.dyslexiaFont = String(settings.dyslexiaFont);
}

let current = loadSettings();
applyToPage(current);

const subscribers = new Set<() => void>();

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

export function getSettings() {
  return current;
}

export function setSettings(next: Partial<Settings>) {
  current = { ...current, ...next };
  applyToPage(current);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage can be blocked; the settings still apply for this visit.
  }
  subscribers.forEach((notify) => notify());
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings);
}
