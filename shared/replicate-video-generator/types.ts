/**
 * Types and interfaces for ReplicateVideoGenerator
 */

export type OutputFormat = 'url' | 'base64' | 'blob';
export type GenerationStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
export type VideoProvider = 'replicate' | 'gemini';

/**
 * Configuration for Replicate video generator
 */
export interface VideoGenerationConfig {
  apiKey: string;
  provider?: VideoProvider; // Provider type
  model?: string; // Replicate model version or identifier
  maxPollingTime?: number; // ms
  pollingInterval?: number; // ms
  retryAttempts?: number;
  outputFormat?: OutputFormat;
  exponentialBackoff?: boolean;
  customEndpoint?: string; // For custom providers
  headers?: Record<string, string>; // Additional headers
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
  modelConfig?: Record<string, any>; // Provider-specific config
  metadata?: Record<string, any>; // Additional metadata
}

/**
 * Polling status returned during generation
 */
export interface PollingStatus {
  status: GenerationStatus;
  progress?: number; // 0-100
  output?: string | Blob;
  error?: string;
  metadata?: Record<string, any>;
  estimatedTimeRemaining?: number; // ms
  attempt?: number;
}

/**
 * Result of video generation
 */
export interface VideoGenerationResult {
  output: string | Blob;
  duration?: number; // ms taken
  provider: VideoProvider;
  metadata?: Record<string, any>;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (status: PollingStatus) => void;

/**
 * Error callback function type
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Provider interface that all providers must implement
 */
export interface VideoGenerationProvider {
  name: VideoProvider;
  
  /**
   * Start video generation and return an operation ID
   */
  startGeneration(input: VideoGenerationInput, config: VideoGenerationConfig): Promise<string>;
  
  /**
   * Check the status of an ongoing generation
   */
  checkStatus(operationId: string, config: VideoGenerationConfig): Promise<PollingStatus>;
  
  /**
   * Cancel an ongoing generation (optional)
   */
  cancelGeneration?(operationId: string, config: VideoGenerationConfig): Promise<void>;
  
  /**
   * Process the output into the desired format
   */
  processOutput(output: any, format: OutputFormat): Promise<string | Blob>;
}

/**
 * Options for retry logic
 */
export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  multiplier?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Queue item for batch processing
 */
export interface QueueItem {
  id: string;
  input: VideoGenerationInput;
  priority?: number;
  createdAt: Date;
  onComplete?: (result: VideoGenerationResult) => void;
  onError?: ErrorCallback;
  onProgress?: ProgressCallback;
}

/**
 * Statistics for progress estimation
 */
export interface GenerationStatistics {
  averageDuration: number;
  successRate: number;
  totalGenerations: number;
  recentDurations: number[];
}
