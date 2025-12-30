"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "./locales/en";
import fr from "./locales/fr";
import es from "./locales/es";

export type Lang = "en" | "fr" | "es";

type Messages = Record<string, string>;

const MESSAGES: Record<Lang, Messages> = { en, fr, es } as const;

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof en | string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "tigo_lang";

export function I18nProvider({ children, defaultLang = "en" as Lang }: { children: React.ReactNode; defaultLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  // Initialize from localStorage on first client render
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && ["en", "fr", "es"].includes(stored)) {
        setLangState(stored);
      }
    } catch {}
  }, []);

  // Persist and reflect in <html lang="...">
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);

  const t = useMemo(() => {
    return (key: string) => {
      const table = MESSAGES[lang] || MESSAGES.en;
      return table[key] ?? MESSAGES.en[key] ?? key;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

