import type { Holiday, ImageDetails, ApiResponse } from './types';

/**
 * Client-side API wrapper for calling Next.js API routes
 */

export const fileToBase64 = (file: File): Promise<{ b64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('Failed to read file content'));
        return;
      }
      const b64 = result.split(',')[1];
      const mimeType = result.split(';')[0].split(':')[1];
      if (!b64 || !mimeType) {
        reject(new Error('Invalid file format'));
        return;
      }
      resolve({ b64, mimeType });
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file. Please try again with a different image.'));
    };
  });
};

/**
 * Creates a blank, base64-encoded PNG image using canvas.
 * @param width The width of the canvas.
 * @param height The height of the canvas.
 * @returns An object with the base64 string and mimeType.
 */
export const createBlankImageB64 = (width: number, height: number): { b64: string; mimeType: string } => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const dataUrl = canvas.toDataURL('image/png');
  const b64 = dataUrl.split(',')[1];
  return { b64, mimeType: 'image/png' };
};

export const fetchHolidays = async (country: string): Promise<Holiday[]> => {
  const response = await fetch('/api/holidays', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ country }),
  });

  const data: ApiResponse<Holiday[]> = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch holidays');
  }
  
  return data.data;
};

export const analyzeLogoStyle = async (logoB64: string, logoMimeType: string): Promise<string> => {
  const response = await fetch('/api/analyze-logo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ logoB64, logoMimeType }),
  });

  const data: ApiResponse<string> = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to analyze logo');
  }
  
  return data.data;
};

export const generateHolidayImage = async (
  logoB64: string,
  logoMimeType: string,
  holiday: Holiday,
  country: string,
  logoAnalysis: string,
  style: string
): Promise<ImageDetails> => {
  // Create a blank 16:9 canvas to enforce aspect ratio
  const blankCanvas = createBlankImageB64(1280, 720);
  
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      logoB64,
      logoMimeType,
      holiday,
      country,
      logoAnalysis,
      style,
      blankCanvasB64: blankCanvas.b64,
      blankCanvasMimeType: blankCanvas.mimeType,
    }),
  });

  const data: ApiResponse<ImageDetails> = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to generate image');
  }
  
  return data.data;
};

export const generateVideoPromptJson = async (
  holiday: Holiday,
  country: string,
  style: string
): Promise<string> => {
  const response = await fetch('/api/generate-video-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ holiday, country, style }),
  });

  const data: ApiResponse<string> = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to generate video prompt');
  }
  
  return data.data;
};

export const refineVideoPromptJson = async (
  currentJson: string,
  userInstructions: string
): Promise<string> => {
  const response = await fetch('/api/refine-video-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentJson, userInstructions }),
  });

  const data: ApiResponse<string> = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to refine video prompt');
  }
  
  return data.data;
};

export const generateVideo = async (
  imageB64: string,
  imageMimeType: string,
  prompt: string
): Promise<string> => {
  const response = await fetch('/api/generate-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageB64, imageMimeType, prompt }),
  });

  const data: ApiResponse<string> = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to generate video');
  }
  
  // Convert base64 video to blob URL
  const videoBase64 = data.data;
  const byteCharacters = atob(videoBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'video/mp4' });
  return URL.createObjectURL(blob);
};
