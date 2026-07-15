import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Lang, TranslationKey } from "./translations";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function loadLang(): Lang {
  const saved = localStorage.getItem("lang");
  return saved === "ar" ? "ar" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  function setLang(next: Lang) {
    setLangState(next);
    localStorage.setItem("lang", next);
  }

  function toggleLang() {
    setLang(lang === "en" ? "ar" : "en");
  }

  function t(key: TranslationKey): string {
    const entry = translations[key];
    if (!entry) {
      console.warn(`Missing translation key: ${key}`);
      return key;
    }
    return entry[lang];
  }

  useEffect(() => {
    // lang attribute only — layout direction stays LTR per your setup
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}