'use client';

import React, { useState, useCallback, ChangeEvent } from 'react';
import { fileToBase64 } from '@/lib/api-client';
import type { ImageDetails } from '@/lib/types';
import { ArrowRightIcon } from '@/components/icons/ArrowRightIcon';
import { useLocale } from '@/hooks/useLocale';

interface Step1LogoCountryProps {
  onNext: (logo: ImageDetails, country: string) => void;
}

const Step1LogoCountry: React.FC<Step1LogoCountryProps> = ({ onNext }) => {
  const { t } = useLocale();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDetails, setLogoDetails] = useState<ImageDetails | null>(null);
  const [country, setCountry] = useState<string>('USA');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit for inline data
        setError(t('step1.error.largeFile'));
        return;
      }
      
      // Check file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError(t('step1.error.invalidFormat'));
        return;
      }
      
      setError(null);
      setLogoPreview(URL.createObjectURL(file));
      const details = await fileToBase64(file);
      setLogoDetails(details);
    }
  }, [t]);

  const handleNext = () => {
    if (logoDetails) {
      onNext(logoDetails, country);
    } else {
      setError(t('step1.error.noLogo'));
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold text-cyan-300">{t('step1.title')}</h2>
      <p className="text-center text-gray-400">{t('step1.description')}</p>
      
      <div className="w-full max-w-sm">
        <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-300 mb-2">
          {t('step1.uploadLogo')}
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md hover:border-cyan-400 transition-colors">
          <div className="space-y-1 text-center">
            {logoPreview ? (
              <div className="flex flex-col items-center gap-2">
                <img src={logoPreview} alt="Logo Preview" className="mx-auto h-24 w-auto object-contain" />
                <p className="text-sm text-green-400">{t('step1.logoUploaded')}</p>
              </div>
            ) : (
              <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <div className="flex text-sm text-gray-500">
              <label htmlFor="logo-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-cyan-500 px-2 py-1">
                <span>{t('step1.uploadInstruction')}</span>
                <input 
                  id="logo-upload" 
                  name="logo-upload" 
                  type="file" 
                  className="sr-only" 
                  accept="image/png, image/jpeg, image/jpg, image/gif, image/webp" 
                  onChange={handleFileChange} 
                />
              </label>
            </div>
            <p className="text-xs text-gray-600">{t('step1.supportedFormats')}</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-2">
          {t('step1.selectCountry')}
        </label>
        <select
          id="country"
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md text-white"
        >
          <option>USA</option>
          <option>Chile</option>
        </select>
      </div>
      
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleNext}
        disabled={!logoDetails}
        className="w-full max-w-sm flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-all"
      >
        {t('step1.continue')} <ArrowRightIcon />
      </button>
    </div>
  );
};

export default Step1LogoCountry;