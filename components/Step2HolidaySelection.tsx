'use client';

import React, { useState } from 'react';
import type { Holiday } from '@/lib/types';
import { Loader } from './Loader';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { useLocale } from '@/hooks/useLocale';

interface Step2HolidaySelectionProps {
  country: string;
  holidays: Holiday[];
  isLoading: boolean;
  onSelect: (holiday: Holiday) => void;
}

const Step2HolidaySelection: React.FC<Step2HolidaySelectionProps> = ({ country, holidays, isLoading, onSelect }) => {
  const { t, locale } = useLocale();
  const [selected, setSelected] = useState<Holiday | null>(null);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 h-64">
            <Loader />
            <p className="text-cyan-300">{t('step2.loading')}</p>
        </div>
    );
  }

  if (!holidays || holidays.length === 0) {
    return <div className="text-center text-gray-400">{t('step2.noHolidays', { country })}</div>;
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold text-cyan-300">{t('step2.title')}</h2>
      <p className="text-center text-gray-400">{t('step2.description')}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {holidays.map((holiday) => (
          <button
            key={holiday.name_en}
            onClick={() => setSelected(holiday)}
            className={`p-4 rounded-lg text-left transition-all duration-200 border-2 flex flex-col gap-2 ${
              selected?.name_en === holiday.name_en
                ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400'
                : 'bg-gray-700/50 border-gray-600 hover:border-cyan-500'
            }`}
          >
            <h3 className="font-bold text-white">{locale === 'es' ? holiday.name_es : holiday.name_en}</h3>
            <p className="text-sm text-gray-400">{locale === 'es' ? holiday.description_es : holiday.description_en}</p>
          </button>
        ))}
      </div>
      
      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        className="w-full max-w-sm flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-all"
      >
        {t('step2.select')} <ArrowRightIcon />
      </button>
    </div>
  );
};

export default Step2HolidaySelection;