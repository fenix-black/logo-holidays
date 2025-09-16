export interface Holiday {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  clothing: string;
  elements: string;
  visualSymbols: string;
  locations: string;
  timeOfDay: string;
  activities: string;
  colorPalette: string;
  flagIsProminent: boolean;
  soundEffects: string;
  musicStyles: string;
}

export interface ImageDetails {
  b64: string;
  mimeType: string;
}

export interface VideoDetails {
  prompt: string;
  url: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
