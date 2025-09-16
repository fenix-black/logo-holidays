'use client';

import React from 'react';
import { useLocale } from '@/hooks/useLocale';

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useLocale();

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-1 rounded-full border border-gray-700 flex items-center gap-1">
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
          locale === 'en' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:bg-gray-700'
        }`}
        aria-label="English"
      >
        EN
      </button>
      <button
        onClick={() => setLocale('es')}
        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
          locale === 'es' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:bg-gray-700'
        }`}
        aria-label="Español"
      >
        ES
      </button>
    </div>
  );
};