'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateVideoPromptJson, generateVideo, refineVideoPromptJson } from '@/lib/api-client';
import type { Holiday, ImageDetails } from '@/lib/types';
import { Loader } from './Loader';
import { DownloadIcon } from './icons/DownloadIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { useLocale } from '@/hooks/useLocale';

interface Step4VideoGenerationProps {
  image: ImageDetails;
  holiday: Holiday;
  country: string;
  selectedStyle: string;
  onBack: () => void;
  onRestart: () => void;
}

const Step4VideoGeneration: React.FC<Step4VideoGenerationProps> = ({ image, holiday, country, selectedStyle, onBack, onRestart }) => {
  const { t } = useLocale();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [refinementScript, setRefinementScript] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(t('step4.generating'));
  const [progress, setProgress] = useState(0);
  const requestInProgressRef = useRef(false);

  const loadingMessages = useMemo(() => [
    t('step4.generating'),
    t('step4.processing'),
  ], [t]);
  
  const handleVideoGeneration = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setProgress(0);

    try {
        const url = await generateVideo(
            image.b64, 
            image.mimeType, 
            prompt,
            (progressValue) => {
                setProgress(progressValue);
                // Update message based on actual progress
                if (progressValue < 30) {
                    setLoadingMessage(t('step4.generating'));
                } else if (progressValue < 70) {
                    setLoadingMessage(t('step4.processing'));
                } else {
                    setLoadingMessage(t('step4.finalizing'));
                }
            }
        );
        setVideoUrl(url);
        setProgress(100);
    } catch(e: any) {
        setError(e.message || "Failed to generate video.");
    } finally {
        setLoading(false);
    }
  }, [image.b64, image.mimeType, t]);
  
  const getInitialPromptAndVideo = useCallback(async () => {
    // Prevent duplicate requests
    if (requestInProgressRef.current) return;
    requestInProgressRef.current = true;
    
    setLoading(true);
    setError(null);
    setLoadingMessage(t('step4.generating'));

    try {
      const initialPrompt = await generateVideoPromptJson(holiday, country, selectedStyle);
      setVideoPrompt(initialPrompt);
      await handleVideoGeneration(initialPrompt);
    } catch (e: any) {
      setError(e.message || "An error occurred.");
      setLoading(false);
    } finally {
      requestInProgressRef.current = false;
    }
  }, [holiday, country, selectedStyle, handleVideoGeneration, t]);

  useEffect(() => {
    getInitialPromptAndVideo();
  }, [getInitialPromptAndVideo]);

  const handleApplyChanges = async () => {
    if (!refinementScript.trim()) {
      setError('Please provide instructions for refinement');
      return;
    }
    setLoading(true);
    setError(null);
    setLoadingMessage('Refining animation script...');
    try {
      const newPrompt = await refineVideoPromptJson(videoPrompt, refinementScript);
      setVideoPrompt(newPrompt);
      setRefinementScript(''); // Clear input after submission
      await handleVideoGeneration(newPrompt);
    } catch (e: any) {
      setError(e.message || 'Failed to apply changes.');
      setLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `logo-${holiday.name_en.toLowerCase().replace(/\s/g, '-')}-${selectedStyle.toLowerCase()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(videoPrompt);
    // You could add a toast notification here
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold text-cyan-300">{t('step4.title')}</h2>
      <p className="text-center text-gray-400">{t('step4.description')}</p>

      <div className="w-full aspect-video bg-gray-700/50 rounded-lg flex items-center justify-center border border-gray-600 overflow-hidden">
        {loading && (
            <div className="flex flex-col items-center justify-center gap-4 p-4 text-center">
                <Loader />
                <p className="text-cyan-300">{loadingMessage}</p>
                {progress > 0 && (
                    <div className="w-full max-w-xs">
                        <div className="bg-gray-600 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-cyan-400 h-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-sm text-gray-400 mt-2">{progress}%</p>
                    </div>
                )}
            </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 p-4 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => handleVideoGeneration(videoPrompt)}
              className="w-auto flex items-center justify-center gap-2 px-6 py-2 border border-yellow-500 text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 ring-offset-gray-900 focus:ring-yellow-500 transition-all"
            >
              <RefreshIcon /> Retry
            </button>
          </div>
        )}
        {videoUrl && !loading && (
          <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
        )}
      </div>

      <div className="w-full">
        <label htmlFor="refinement-script" className="block text-sm font-medium text-gray-300 mb-2">
          {t('step4.refineTitle')}
        </label>
        <p className="text-xs text-gray-400 mb-2">{t('step4.refineInstructions')}</p>
        <textarea
          id="refinement-script"
          rows={3}
          value={refinementScript}
          onChange={(e) => setRefinementScript(e.target.value)}
          disabled={loading}
          placeholder="e.g., Make the logo spin faster, add more sparkles, change the transition to a fade..."
          className="block w-full text-sm bg-gray-900/70 border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 font-sans disabled:opacity-50 p-3"
        />
      </div>

      <div className="w-full">
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={() => setShowJson(!showJson)} 
            className="text-sm text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            {showJson ? <EyeOffIcon /> : <EyeIcon />}
            {showJson ? 'Hide' : 'Show'} {t('step4.promptTitle')}
          </button>
          {showJson && (
            <button
              onClick={handleCopyPrompt}
              className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
            >
              Copy JSON
            </button>
          )}
        </div>
        {showJson && (
            <textarea
              id="video-prompt"
              rows={10}
              value={videoPrompt}
              readOnly
              className="block w-full text-sm bg-gray-900/70 border-gray-600 rounded-md text-gray-200 font-mono opacity-70 p-3"
            />
        )}
      </div>
      
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={onRestart}
            className="w-full px-6 py-3 border border-gray-500 text-base font-medium rounded-md text-white bg-transparent hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-all"
          >
            {t('step4.button.restart')}
          </button>
          <button
            onClick={handleApplyChanges}
            disabled={loading || !refinementScript.trim()}
            className="w-full px-6 py-3 border border-gray-500 text-base font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-all"
          >
            {t('step4.button.apply')}
          </button>
          <button
            onClick={handleDownload}
            disabled={!videoUrl || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-all"
          >
            <DownloadIcon /> {t('step4.button.download')}
          </button>
      </div>
      
      <div className="w-full flex justify-between items-center mt-2">
            <button onClick={onBack} className="text-sm text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1">
                <ArrowLeftIcon /> {t('step4.button.back')}
            </button>
            <button onClick={onRestart} className="text-sm text-gray-400 hover:text-red-400 transition-colors">
                {t('step4.button.restart')}
            </button>
      </div>
    </div>
  );
};

export default Step4VideoGeneration;