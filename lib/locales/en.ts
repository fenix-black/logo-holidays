export const en: Record<string, string> = {
  // App.tsx
  'app.title': 'Logo Holidays Generator',
  'app.description': 'Create festive animated videos for your brand in minutes.',
  'app.poweredBy': 'Powered by FenixBlack.ai',
  'app.error.fetch': 'Failed to fetch initial data.',
  'app.error.invalidStep': 'Invalid Step',

  // LanguageSwitcher.tsx
  'language.switcher.label': 'Language',
  'languageSwitcher.english': 'English',
  'languageSwitcher.spanish': 'Español',

  // Step1LogoCountry.tsx
  'step1.title': 'Step 1: Your Brand',
  'step1.description': 'Upload your company logo and select a country to find relevant holidays.',
  'step1.logo.label': 'Upload Logo',
  'step1.logo.upload': 'Upload a file',
  'step1.logo.drag': 'or drag and drop',
  'step1.logo.formats': 'PNG, JPG, WEBP up to 4MB',
  'step1.logo.error.size': 'File size must be less than 4MB.',
  'step1.logo.error.required': 'Please upload a logo to continue.',
  'step1.country.label': 'Select Country',
  'step1.button.next': 'Find Holidays',
  
  // Legacy mappings for compatibility
  'step1.subtitle': 'Upload your company logo and select a country to find relevant holidays.',
  'step1.uploadLogo': 'Upload Logo',
  'step1.uploadInstruction': 'Upload a file or drag and drop',
  'step1.supportedFormats': 'PNG, JPG, WEBP up to 4MB',
  'step1.logoUploaded': 'Logo uploaded successfully',
  'step1.selectCountry': 'Select Country',
  'step1.continue': 'Find Holidays',
  'step1.error.noLogo': 'Please upload a logo to continue.',
  'step1.error.largeFile': 'File size must be less than 4MB.',
  'step1.error.invalidFormat': 'Invalid file format. Please use PNG, JPG, GIF, or WEBP',

  // Step2HolidaySelection.tsx
  'step2.loading': 'Analyzing your logo\'s visual style...',
  'step2.noHolidays': 'No holidays found for {country}.',
  'step2.title': 'Step 2: Choose a Holiday',
  'step2.description': 'Select a holiday to theme your logo animation.',
  'step2.button.next': 'Generate Image',
  
  // Legacy mappings
  'step2.subtitle': 'Select a holiday to theme your logo animation.',
  'step2.select': 'Generate Image',

  // Step3ImageGeneration.tsx
  'step3.title': 'Step 3: Create The Scene',
  'step3.description': 'Our AI is generating an image for {holidayName}. You can guide the style below.',
  'step3.loading': 'Generating your festive image...',
  'step3.style.label': 'Guiding Style',
  'step3.button.renew': 'Renew Image',
  'step3.button.download': 'Download Image',
  'step3.button.confirm': 'Confirm & Generate Video',
  'step3.button.back': 'Back to Holidays',
  'step3.button.restart': 'Start Over',
  
  // Legacy mappings
  'step3.subtitle': 'Our AI is generating an image for {holiday}. You can guide the style below.',
  'step3.styleLabel': 'Guiding Style',
  'step3.generating': 'Generating your festive image...',
  'step3.generatingText': 'This may take up to 30 seconds',
  'step3.preview': 'Preview',
  'step3.regenerate': 'Renew Image',
  'step3.download': 'Download Image',
  'step3.confirm': 'Confirm & Generate Video',
  'step3.back': 'Back to Holidays',
  'step3.restart': 'Start Over',
  
  // Style options
  'style.Default': 'Default',
  'style.Cheerful': 'Cheerful',
  'style.Cute': 'Cute',
  'style.Daylight': 'Daylight',
  'style.Vintage': 'Vintage',
  'style.Cinematic': 'Cinematic',

  // Step4VideoGeneration.tsx
  'step4.title': 'Step 4: Animation & Refinement',
  'step4.description': 'Your video is ready! You can refine the animation by writing instructions below.',
  'step4.refine.label': 'Refine Animation Script',
  'step4.refine.placeholder': "Example: 'Make the first scene faster and add more fireworks. The logo should sparkle instead of shimmer.'",
  'step4.json.show': 'Show Full Animation Script (JSON)',
  'step4.json.hide': 'Hide Full Animation Script (JSON)',
  'step4.button.restart': 'Start Over',
  'step4.button.apply': 'Apply Changes',
  'step4.button.download': 'Download Video',
  'step4.button.back': 'Back to Image',
  'step4.button.retry': 'Retry Generation',
  'step4.loading.prompt': 'Crafting your video animation prompt...',
  'step4.loading.studio': 'Sending your scene to the video studio...',
  'step4.loading.render': 'Rendering your video, this can take a few minutes...',
  'step4.loading.progress': 'Checking on the render progress...',
  'step4.loading.final': 'Almost there, adding the final touches...',
  'step4.error.refineEmpty': 'Please enter instructions to refine the script.',
  'step4.loading.refine': 'Applying your script changes...',
  
  // Legacy mappings
  'step4.subtitle': 'Your video is ready! You can refine the animation by writing instructions below.',
  'step4.promptTitle': 'Animation Script',
  'step4.promptEdit': 'Edit Prompt',
  'step4.promptSave': 'Save Changes',
  'step4.promptCancel': 'Cancel',
  'step4.promptRefine': 'Refine Prompt',
  'step4.refineTitle': 'Refine Animation Script',
  'step4.refineInstructions': "Example: 'Make the first scene faster and add more fireworks. The logo should sparkle instead of shimmer.'",
  'step4.refineApply': 'Apply Changes',
  'step4.refineCancel': 'Cancel',
  'step4.generateVideo': 'Generate Video',
  'step4.generating': 'Generating your video...',
  'step4.processing': 'Processing your video...',
  'step4.generatingText': 'This may take 2-5 minutes',
  'step4.downloadVideo': 'Download Video',
  'step4.restart': 'Start Over',
  'step4.promptCopied': 'Prompt copied to clipboard!',

  'loader.generating': 'Generating...',
};
