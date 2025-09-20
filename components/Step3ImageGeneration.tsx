'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateHolidayImage } from '@/lib/api-client';
import type { Holiday, ImageDetails } from '@/lib/types';
import { convertImageToJpg, formatBytes, getOptimalQuality } from '@/lib/image-utils';
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
  initialImage?: ImageDetails | null;
  onConfirm: (image: ImageDetails) => void;
  onBack: () => void;
  onRestart: () => void;
}

const Step3ImageGeneration: React.FC<Step3ImageGenerationProps> = ({ 
  logo, holiday, country, logoAnalysis, selectedStyle, onStyleChange, initialImage, onConfirm, onBack, onRestart 
}) => {
  const { t, locale } = useLocale();
  const [image, setImage] = useState<ImageDetails | null>(initialImage || null);
  const [jpgImage, setJpgImage] = useState<ImageDetails | null>(null);
  const [conversionInfo, setConversionInfo] = useState<{ratio: number, saved: string} | null>(null);
  const [loading, setLoading] = useState(!initialImage);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInProgressRef = useRef(false);
  const previousStyleRef = useRef(selectedStyle);

  // Create a composite image with logo on 16:9 canvas
  const createLogoComposite = useCallback(async (logoB64: string, logoMimeType: string): Promise<{ b64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      // Create canvas with 16:9 aspect ratio
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1920, 1080);

      // Load logo image
      const logoImg = new Image();
      logoImg.onload = () => {
        // Calculate logo dimensions (max 1/3 of canvas)
        const maxLogoWidth = 1920 / 3;  // 640px
        const maxLogoHeight = 1080 / 3; // 360px
        
        let finalLogoWidth = logoImg.width;
        let finalLogoHeight = logoImg.height;

        // Scale down if needed
        if (logoImg.width > maxLogoWidth || logoImg.height > maxLogoHeight) {
          const scaleX = maxLogoWidth / logoImg.width;
          const scaleY = maxLogoHeight / logoImg.height;
          const scale = Math.min(scaleX, scaleY);
          
          finalLogoWidth = Math.round(logoImg.width * scale);
          finalLogoHeight = Math.round(logoImg.height * scale);
        }

        // Center the logo on canvas
        const x = Math.round((1920 - finalLogoWidth) / 2);
        const y = Math.round((1080 - finalLogoHeight) / 2);

        // Draw with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(logoImg, x, y, finalLogoWidth, finalLogoHeight);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create image blob'));
            return;
          }
          
          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const b64 = result.split(',')[1];
            resolve({ b64, mimeType: 'image/png' });
          };
          reader.onerror = () => reject(new Error('Failed to convert image'));
          reader.readAsDataURL(blob);
        }, 'image/png');
      };

      logoImg.onerror = () => {
        reject(new Error('Failed to load logo image'));
      };

      // Start loading the logo
      logoImg.src = `data:${logoMimeType};base64,${logoB64}`;
    });
  }, []);

  const generateImage = useCallback(async () => {
    // Prevent duplicate requests
    if (requestInProgressRef.current) return;
    requestInProgressRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      setImage(null);
      
      // Create composite image with logo on canvas
      const composite = await createLogoComposite(logo.b64, logo.mimeType);
      
      // Generate the holiday image with the composite
      const generatedImg = await generateHolidayImage(composite.b64, composite.mimeType, holiday, country, logoAnalysis, selectedStyle);
      setImage(generatedImg);
      
      // Convert to JPG for optimization
      setConverting(true);
      try {
        const converted = await convertImageToJpg(generatedImg.b64, {
          quality: getOptimalQuality('ai-context'),
          maxWidth: 1024,
          maxHeight: 1024
        });
        
        setJpgImage({
          b64: converted.b64,
          mimeType: converted.mimeType
        });
        
        setConversionInfo({
          ratio: converted.compressionRatio,
          saved: formatBytes(converted.originalSize - converted.compressedSize)
        });
      } catch (conversionError) {
        console.error('Image conversion failed:', conversionError);
        // Fallback to original if conversion fails
        setJpgImage(null);
      } finally {
        setConverting(false);
      }
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
      requestInProgressRef.current = false;
    }
  }, [logo.b64, logo.mimeType, holiday, country, logoAnalysis, selectedStyle, createLogoComposite]);

  useEffect(() => {
    // Generate image if:
    // 1. No initial image (first time on Step 3), OR
    // 2. Style has changed (even when coming back from Step 4)
    const styleChanged = previousStyleRef.current !== selectedStyle;
    
    if (!initialImage || styleChanged) {
      if (styleChanged) {
        // Clear current image when style changes to show loading state
        setImage(null);
        previousStyleRef.current = selectedStyle;
      }
      generateImage();
    }
  }, [generateImage, initialImage, selectedStyle]);

  const handleDownloadImage = () => {
    // Prefer JPG version if available for smaller file size
    const imageToDownload = jpgImage || image;
    if (!imageToDownload) return;
    
    const link = document.createElement('a');
    link.href = `data:${imageToDownload.mimeType};base64,${imageToDownload.b64}`;
    const fileExtension = imageToDownload.mimeType.split('/')[1] || 'png';
    link.download = `logo-${holiday.name_en.toLowerCase().replace(/\s/g, '-')}-${selectedStyle.toLowerCase()}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold text-cyan-300">{t('step3.title')}</h2>
      <p className="text-center text-gray-400">{t('step3.description', { holidayName: locale === 'es' ? holiday.name_es : holiday.name_en })}</p>

      <div className="w-full bg-gray-700/50 rounded-lg flex items-center justify-center border border-gray-600 overflow-hidden min-h-[300px] relative">
        {loading && (
            <div className="flex flex-col items-center justify-center gap-4 p-4 text-center">
                <Loader />
                <p className="text-cyan-300">{t('step3.generating')}</p>
                <p className="text-gray-400 text-sm">{t('step3.generatingText')}</p>
            </div>
        )}
        {error && <div className="text-center text-red-400 p-4">{error}</div>}
        {image && (
          <>
            <img
              src={`data:${image.mimeType};base64,${image.b64}`}
              alt="Generated holiday-themed logo"
              className="w-full h-auto object-contain max-h-[60vh]"
            />
            {converting && (
              <div className="absolute bottom-2 left-2 right-2 text-sm text-gray-300 text-center bg-gray-800/80 rounded px-2 py-1">
                Optimizing image for faster processing...
              </div>
            )}
          </>
        )}
      </div>

       <div className="w-full">
            <h3 className="text-lg font-semibold text-center text-gray-300 mb-3">{t('step3.styleLabel')}</h3>
            <div className="flex flex-wrap justify-center gap-3">
                {GUIDING_STYLES.map(style => (
                    <button 
                      key={style} 
                      onClick={() => {
                        if (style !== selectedStyle && !loading) {
                          onStyleChange(style);
                        }
                      }}
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
            onClick={() => {
              // Use JPG version if available (for token optimization), otherwise use original
              const imageToPass = jpgImage || image;
              if (imageToPass) onConfirm(imageToPass);
            }}
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