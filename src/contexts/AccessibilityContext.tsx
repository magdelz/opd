import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type A11ySettings = {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
};

type AccessibilityContextType = A11ySettings & {
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleReduceMotion: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'app_a11y';

function loadSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { highContrast: false, largeText: false, reduceMotion: false };
}

function saveSettings(s: A11ySettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(loadSettings);

  // Apply CSS classes to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('large-text', settings.largeText);
    root.classList.toggle('reduce-motion', settings.reduceMotion);
    saveSettings(settings);
  }, [settings]);

  const toggleHighContrast = useCallback(() => setSettings(s => ({ ...s, highContrast: !s.highContrast })), []);
  const toggleLargeText = useCallback(() => setSettings(s => ({ ...s, largeText: !s.largeText })), []);
  const toggleReduceMotion = useCallback(() => setSettings(s => ({ ...s, reduceMotion: !s.reduceMotion })), []);

  return (
    <AccessibilityContext.Provider value={{ ...settings, toggleHighContrast, toggleLargeText, toggleReduceMotion }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useA11y() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useA11y must be used within AccessibilityProvider');
  return ctx;
}
