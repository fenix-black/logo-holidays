export const es: Record<string, string> = {
  // App.tsx
  'app.title': 'Generador de Logos Festivos',
  'app.description': 'Crea videos animados festivos para tu marca en minutos.',
  'app.poweredBy': 'Desarrollado por FenixBlack.ai',
  'app.error.fetch': 'Error al cargar los datos iniciales.',
  'app.error.invalidStep': 'Paso no válido',
  
  // LanguageSwitcher.tsx
  'language.switcher.label': 'Idioma',
  'languageSwitcher.english': 'English',
  'languageSwitcher.spanish': 'Español',

  // Step1LogoCountry.tsx
  'step1.title': 'Paso 1: Tu Marca',
  'step1.description': 'Sube el logo de tu empresa y selecciona un país para encontrar los feriados correspondientes.',
  'step1.logo.label': 'Subir Logo',
  'step1.logo.upload': 'Sube un archivo',
  'step1.logo.drag': 'o arrastra y suelta',
  'step1.logo.formats': 'PNG, JPG, WEBP hasta 4MB',
  'step1.logo.error.size': 'El tamaño del archivo debe ser inferior a 4MB.',
  'step1.logo.error.required': 'Por favor, sube un logo para continuar.',
  'step1.country.label': 'Seleccionar País',
  'step1.button.next': 'Buscar Feriados',
  
  // Legacy mappings for compatibility
  'step1.subtitle': 'Sube el logo de tu empresa y selecciona un país para encontrar los feriados correspondientes.',
  'step1.uploadLogo': 'Subir Logo',
  'step1.uploadInstruction': 'Sube un archivo o arrastra y suelta',
  'step1.supportedFormats': 'PNG, JPG, WEBP hasta 4MB',
  'step1.logoUploaded': 'Logo subido exitosamente',
  'step1.selectCountry': 'Seleccionar País',
  'step1.continue': 'Buscar Feriados',
  'step1.error.noLogo': 'Por favor, sube un logo para continuar.',
  'step1.error.largeFile': 'El tamaño del archivo debe ser inferior a 4MB.',
  'step1.error.invalidFormat': 'Formato inválido. Usa PNG, JPG, GIF o WEBP',

  // Step2HolidaySelection.tsx
  'step2.loading': 'Analizando el estilo visual de tu logo...',
  'step2.noHolidays': 'No se encontraron feriados para {country}.',
  'step2.title': 'Paso 2: Elige un Feriado',
  'step2.description': 'Selecciona un feriado para la animación de tu logo.',
  'step2.button.next': 'Generar Imagen',
  
  // Legacy mappings
  'step2.subtitle': 'Selecciona un feriado para la animación de tu logo.',
  'step2.select': 'Generar Imagen',

  // Step3ImageGeneration.tsx
  'step3.title': 'Paso 3: Crea la Escena',
  'step3.description': 'Nuestra IA está generando una imagen para {holidayName}. Puedes guiar el estilo a continuación.',
  'step3.loading': 'Generando tu imagen festiva...',
  'step3.style.label': 'Estilo Guía',
  'step3.button.renew': 'Renovar Imagen',
  'step3.button.download': 'Descargar Imagen',
  'step3.button.confirm': 'Confirmar y Generar Video',
  'step3.button.back': 'Volver a Feriados',
  'step3.button.restart': 'Empezar de Nuevo',
  
  // Legacy mappings
  'step3.subtitle': 'Nuestra IA está generando una imagen para {holiday}. Puedes guiar el estilo a continuación.',
  'step3.styleLabel': 'Estilo Guía',
  'step3.generating': 'Generando tu imagen festiva...',
  'step3.generatingText': 'Esto puede tardar hasta 30 segundos',
  'step3.preview': 'Vista Previa',
  'step3.regenerate': 'Renovar Imagen',
  'step3.download': 'Descargar Imagen',
  'step3.confirm': 'Confirmar y Generar Video',
  'step3.back': 'Volver a Feriados',
  'step3.restart': 'Empezar de Nuevo',
  
  // Style options
  'style.Default': 'Predeterminado',
  'style.Cheerful': 'Alegre',
  'style.Cute': 'Lindo',
  'style.Daylight': 'Luz de Día',
  'style.Vintage': 'Vintage',
  'style.Cinematic': 'Cinemático',

  // Step4VideoGeneration.tsx
  'step4.title': 'Paso 4: Animación y Refinamiento',
  'step4.description': '¡Tu video está listo! Puedes refinar la animación escribiendo instrucciones a continuación.',
  'step4.refine.label': 'Refinar Guion de Animación',
  'step4.refine.placeholder': "Ejemplo: 'Haz la primera escena más rápida y agrega más fuegos artificiales. El logo debería brillar en lugar de destellar.'",
  'step4.json.show': 'Mostrar Guion de Animación Completo (JSON)',
  'step4.json.hide': 'Ocultar Guion de Animación Completo (JSON)',
  'step4.button.restart': 'Empezar de Nuevo',
  'step4.button.apply': 'Aplicar Cambios',
  'step4.button.download': 'Descargar Video',
  'step4.button.back': 'Volver a la Imagen',
  'step4.button.retry': 'Reintentar Generación',
  'step4.loading.prompt': 'Creando el guion para tu animación de video...',
  'step4.loading.studio': 'Enviando tu escena al estudio de video...',
  'step4.loading.render': 'Renderizando tu video, esto puede tardar unos minutos...',
  'step4.loading.progress': 'Verificando el progreso del renderizado...',
  'step4.loading.final': 'Casi listo, añadiendo los toques finales...',
  'step4.error.refineEmpty': 'Por favor, ingresa instrucciones para refinar el guion.',
  'step4.loading.refine': 'Aplicando los cambios a tu guion...',
  
  // Legacy mappings
  'step4.subtitle': '¡Tu video está listo! Puedes refinar la animación escribiendo instrucciones a continuación.',
  'step4.promptTitle': 'Guión de Animación',
  'step4.promptEdit': 'Editar Guión',
  'step4.promptSave': 'Guardar Cambios',
  'step4.promptCancel': 'Cancelar',
  'step4.promptRefine': 'Refinar Guión',
  'step4.refineTitle': 'Refinar Guion de Animación',
  'step4.refineInstructions': "Ejemplo: 'Haz la primera escena más rápida y agrega más fuegos artificiales. El logo debería brillar en lugar de destellar.'",
  'step4.refineApply': 'Aplicar Cambios',
  'step4.refineCancel': 'Cancelar',
  'step4.generateVideo': 'Generar Video',
  'step4.generating': 'Generando tu video...',
  'step4.generatingText': 'Esto puede tardar de 2 a 5 minutos',
  'step4.downloadVideo': 'Descargar Video',
  'step4.restart': 'Empezar de Nuevo',
  'step4.promptCopied': '¡Guión copiado al portapapeles!',
  
  'loader.generating': 'Generando...',
};
