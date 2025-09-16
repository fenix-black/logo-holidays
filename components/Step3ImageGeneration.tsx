'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateHolidayImage } from '@/lib/api-client';
import type { Holiday, ImageDetails } from '@/lib/types';
import { Loader } from './Loader';
import { RefreshIcon } from './icons/RefreshIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { useLocale } from '@/hooks/useLocale';

const GUIDING_STYLES = ['Default', 'Cheerful', 'Cute', 'Daylight', 'Vintage', 'Cinematic'];

interface Step3ImageGenerationProps {
  logo: ImageDetails;
  holiday: Holiday;
  country: string;
  logoAnalysis: string;
  selectedStyle: string;
  onStyleChange: (style: string) => void;
  onConfirm: (image: ImageDetails) => void;
  onBack: () => void;
  onRestart: () => void;
}

const Step3ImageGeneration: React.FC<Step3ImageGenerationProps> = ({ 
  logo, holiday, country, logoAnalysis, selectedStyle, onStyleChange, onConfirm, onBack, onRestart 
}) => {
  const { t, locale } = useLocale();
  const [image, setImage] = useState<ImageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestInProgressRef = useRef(false);

  const generateImage = useCallback(async () => {
    // Prevent duplicate requests
    if (requestInProgressRef.current) return;
    requestInProgressRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      setImage(null);
      const generatedImg = await generateHolidayImage(logo.b64, logo.mimeType, holiday, country, logoAnalysis, selectedStyle);
      setImage(generatedImg);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
      requestInProgressRef.current = false;
    }
  }, [logo.b64, logo.mimeType, holiday, country, logoAnalysis, selectedStyle]);

  useEffect(() => {
    generateImage();
  }, [generateImage]);

  const handleDownloadImage = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = `data:${image.mimeType};base64,${image.b64}`;
    const fileExtension = image.mimeType.split('/')[1] || 'png';
    link.download = `logo-${holiday.name_en.toLowerCase().replace(/\s/g, '-')}-${selectedStyle.toLowerCase()}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold text-cyan-300">{t('step3.title')}</h2>
      <p className="text-center text-gray-400">{t('step3.description', { holidayName: locale === 'es' ? holiday.name_es : holiday.name_en })}</p>

      <div className="w-full bg-gray-700/50 rounded-lg flex items-center justify-center border border-gray-600 overflow-hidden min-h-[300px]">
        {loading && (
            <div className="flex flex-col items-center justify-center gap-4 p-4 text-center">
                <Loader />
                <p className="text-cyan-300">{t('step3.generating')}</p>
                <p className="text-gray-400 text-sm">{t('step3.generatingText')}</p>
            </div>
        )}
        {error && <div className="text-center text-red-400 p-4">{error}</div>}
        {image && (
          <img
            src={`data:${image.mimeType};base64,${image.b64}`}
            alt="Generated holiday-themed logo"
            className="w-full h-auto object-contain max-h-[60vh]"
          />
        )}
      </div>

       <div className="w-full">
            <h3 className="text-lg font-semibold text-center text-gray-300 mb-3">{t('step3.styleLabel')}</h3>
            <div className="flex flex-wrap justify-center gap-3">
                {GUIDING_STYLES.map(style => (
                    <button 
                      key={style} 
                      onClick={() => onStyleChange(style)}
                      disabled={loading}
                      className={`px-4 py-2 text-sm font-medium rounded-full border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedStyle === style
                          ? 'bg-cyan-500 text-white border-cyan-500'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-cyan-500 text-gray-300'
                      }`}
                    >
                        {t(`style.${style}`)}
                    </button>
                ))}
            </div>
        </div>
      
      <div className="w-full flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
                onClick={generateImage}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-500 text-base font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-all"
            >
                <RefreshIcon /> {t('step3.regenerate')}
            </button>
            <button
                onClick={handleDownloadImage}
                disabled={!image || loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-500 text-base font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-all"
            >
                <DownloadIcon /> {t('step3.download')}
            </button>
        </div>
        <button
            onClick={() => image && onConfirm(image)}
            disabled={!image || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-all"
        >
            {t('step3.confirm')} <CheckIcon />
        </button>
      </div>

      <div className="w-full flex justify-between items-center mt-2">
            <button onClick={onBack} className="text-sm text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1">
                <ArrowLeftIcon /> {t('step3.back')}
            </button>
            <button onClick={onRestart} className="text-sm text-gray-400 hover:text-red-400 transition-colors">
                {t('step3.restart')}
            </button>
        </div>
    </div>
  );
};

export default Step3ImageGeneration;