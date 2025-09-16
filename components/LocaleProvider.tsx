'use client';

import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { en } from '../lib/locales/en';
import { es } from '../lib/locales/es';

type Locale = 'en' | 'es';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const translations: Record<Locale, Record<string, string>> = { en, es };

const getBrowserLocale = (): Locale => {
  if (typeof window !== 'undefined' && navigator.language) {
    const browserLang = navigator.language.slice(0, 2);
    return browserLang === 'es' ? 'es' : 'en';
  }
  return 'en';
};

export const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always start with 'en' to match server-side rendering
  const [locale, setLocale] = useState<Locale>('en');
  
  // After mounting, detect and set browser locale
  useEffect(() => {
    const browserLocale = getBrowserLocale();
    if (browserLocale !== 'en') {
      setLocale(browserLocale);
    }
  }, []);

  const t = useCallback((key: string, values?: Record<string, string | number>) => {
    let translation = translations[locale][key] || key;
    if (values) {
      Object.keys(values).forEach(valueKey => {
        translation = translation.replace(`{${valueKey}}`, String(values[valueKey]));
      });
    }
    return translation;
  }, [locale]);
  
  const value = useMemo(() => ({
    locale,
    setLocale,
    t
  }), [locale, t]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};
