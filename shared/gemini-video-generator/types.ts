/**
 * Types and interfaces for GeminiVideoGenerator
 */

export type OutputFormat = 'url' | 'base64' | 'blob';
export type GenerationStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';

/**
 * Configuration for Gemini video generator
 */
export interface VideoGenerationConfig {
  apiKey: string;
  model?: string; // Default: 'models/video-01' for VEO3
  fallbackModels?: string[]; // Alternative models to try if primary fails
  maxPollingTime?: number; // ms
  pollingInterval?: number; // ms
  outputFormat?: OutputFormat;
  retryOnOverload?: boolean; // Whether to auto-retry with fallback models on overload
}

/**
 * Input for video generation
 */
export interface VideoGenerationInput {
  prompt: string;
  imageData: {
    base64: string;
    mimeType: string;
  };
  useJsonFormat?: boolean; // Use VEO JSON format
  modelConfig?: Record<string, any>;
}

/**
 * Polling status
 */
export interface PollingStatus {
  status: GenerationStatus;
  progress?: number;
  output?: string;
  error?: string;
  isOverloadError?: boolean; // Indicates if error is due to model overload
}

/**
 * Progress callback
 */
export type ProgressCallback = (status: PollingStatus) => void;
