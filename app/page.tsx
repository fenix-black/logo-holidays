'use client';

import React, { useState } from 'react';
import type { Holiday, ImageDetails } from '@/lib/types';
import Step1LogoCountry from '@/components/Step1LogoCountry';
import Step2HolidaySelection from '@/components/Step2HolidaySelection';
import Step3ImageGeneration from '@/components/Step3ImageGeneration';
import Step4VideoGeneration from '@/components/Step4VideoGeneration';
import { fetchHolidays, analyzeLogoStyle } from '@/lib/api-client';
import { useLocale } from '@/hooks/useLocale';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Home() {
  const { t } = useLocale();
  const [step, setStep] = useState(1);
  const [logoDetails, setLogoDetails] = useState<ImageDetails | null>(null);
  const [country, setCountry] = useState<string>('USA');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [logoAnalysis, setLogoAnalysis] = useState<string | null>(null);
  const [isStep2Loading, setIsStep2Loading] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [generatedImage, setGeneratedImage] = useState<ImageDetails | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('Default');
  const [error, setError] = useState<string | null>(null);

  const handleLogoAndCountrySelect = async (logo: ImageDetails, selectedCountry: string) => {
    setLogoDetails(logo);
    setCountry(selectedCountry);
    setError(null);
    setStep(2);
    setIsStep2Loading(true);

    try {
      const [fetchedHolidays, analysis] = await Promise.all([
        fetchHolidays(selectedCountry),
        analyzeLogoStyle(logo.b64, logo.mimeType)
      ]);
      setHolidays(fetchedHolidays);
      setLogoAnalysis(analysis);
    } catch (e: any) {
      setError(e.message || t('app.error.fetch'));
      // Optional: handle error, maybe go back to step 1
    } finally {
      setIsStep2Loading(false);
    }
  };

  const handleHolidaySelect = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setError(null);
    setStep(3);
  };

  const handleImageConfirm = (image: ImageDetails) => {
    setGeneratedImage(image);
    setError(null);
    setStep(4);
  };
  
  const handleBackToStep2 = () => {
    setStep(2);
    setSelectedStyle('Default'); // Reset style when going back
  };
  
  const handleBackToStep3 = () => {
    setStep(3);
  };

  const handleRestart = () => {
    setStep(1);
    setLogoDetails(null);
    setCountry('USA');
    setSelectedHoliday(null);
    setGeneratedImage(null);
    setHolidays([]);
    setLogoAnalysis(null);
    setSelectedStyle('Default');
    setError(null);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1LogoCountry onNext={handleLogoAndCountrySelect} />;
      case 2:
        return <Step2HolidaySelection country={country} holidays={holidays} isLoading={isStep2Loading} onSelect={handleHolidaySelect} />;
      case 3:
        if (!logoDetails || !selectedHoliday || !logoAnalysis) return null;
        return <Step3ImageGeneration 
          logo={logoDetails} 
          holiday={selectedHoliday} 
          country={country} 
          logoAnalysis={logoAnalysis}
          selectedStyle={selectedStyle}
          onStyleChange={setSelectedStyle}
          initialImage={generatedImage}
          onConfirm={handleImageConfirm} 
          onBack={handleBackToStep2} 
          onRestart={handleRestart} 
        />;
      case 4:
        if (!generatedImage || !selectedHoliday) return null;
        return <Step4VideoGeneration 
          image={generatedImage} 
          holiday={selectedHoliday} 
          country={country} 
          selectedStyle={selectedStyle}
          onBack={handleBackToStep3}
          onRestart={handleRestart} 
        />;
      default:
        return <div>{t('app.error.invalidStep')}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 text-transparent bg-clip-text">
            {t('app.title')}
          </h1>
          <p className="text-gray-400 mt-2 mb-4">{t('app.description')}</p>
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="bg-gray-800/50 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-2xl shadow-cyan-500/10 border border-gray-700">
            {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4">{error}</div>}
            {renderStep()}
        </main>
         <footer className="text-center mt-8">
            <a 
              href="https://www.fenixblack.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 text-gray-400 hover:text-cyan-400 transition-all duration-300 group"
            >
              <img 
                src="/ave-solo-alpha.png" 
                alt="FenixBlack.ai" 
                className="opacity-70 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105 transform"
              />
              <span className="text-sm font-medium group-hover:translate-y-[-2px] transition-transform duration-300">
                Made by FenixBlack.ai
              </span>
            </a>
        </footer>
      </div>
    </div>
  );
}
