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
  compositeB64: string,
  compositeMimeType: string,
  holiday: Holiday,
  country: string,
  logoAnalysis: string,
  style: string
): Promise<ImageDetails> => {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositeB64,
      compositeMimeType,
      holiday,
      country,
      logoAnalysis,
      style,
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

interface VideoStatusResponse {
  status: 'processing' | 'succeeded' | 'failed';
  progress?: number;
  videoUrl?: string;
  error?: string;
}

export const generateVideo = async (
  imageB64: string,
  imageMimeType: string,
  prompt: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Start the video generation
  const startResponse = await fetch('/api/generate-video/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageB64, imageMimeType, prompt }),
  });

  const startData: ApiResponse<{ operationName: string }> = await startResponse.json();
  
  if (!startData.success || !startData.data) {
    throw new Error(startData.error || 'Failed to start video generation');
  }

  const operationName = startData.data.operationName;
  console.log('Started video generation with operation:', operationName);

  // Poll for completion
  const maxPollingTime = 600000; // 10 minutes
  const pollingInterval = 5000; // 5 seconds
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxPollingTime) {
    // Wait before checking (except first iteration)
    if (Date.now() > startTime) {
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }

    // Check status
    const statusResponse = await fetch('/api/generate-video/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operationName }),
    });

    const statusData: ApiResponse<VideoStatusResponse> = await statusResponse.json();
    
    if (!statusData.success || !statusData.data) {
      throw new Error(statusData.error || 'Failed to check video status');
    }

    const { status, progress, videoUrl, error } = statusData.data;

    // Update progress callback
    if (onProgress && progress !== undefined) {
      onProgress(progress);
    }

    // Handle completion
    if (status === 'succeeded' && videoUrl) {
      // Convert base64 video to blob URL
      const videoBase64 = videoUrl;
      const byteCharacters = atob(videoBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'video/mp4' });
      return URL.createObjectURL(blob);
    }

    // Handle failure
    if (status === 'failed') {
      throw new Error(error || 'Video generation failed');
    }
  }

  throw new Error('Video generation timed out');
};
