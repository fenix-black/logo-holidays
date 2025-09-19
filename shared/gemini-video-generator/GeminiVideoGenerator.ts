import { GoogleGenAI } from '@google/genai';
import { 
  VideoGenerationConfig, 
  VideoGenerationInput, 
  PollingStatus,
  ProgressCallback 
} from './types';

/**
 * GeminiVideoGenerator - Video generation with polling support for Google Gemini API
 * Based on patterns from restore-photos codebase
 */
export class GeminiVideoGenerator {
  private config: VideoGenerationConfig;
  private abortController?: AbortController;
  private ai: GoogleGenAI;

  constructor(config: VideoGenerationConfig) {
    this.config = {
      maxPollingTime: 600000, // 10 minutes default
      pollingInterval: 5000, // 5 seconds default  
      outputFormat: 'url',
      model: 'veo-3.0-fast-generate-001', // VEO3 default
      ...config
    };
    
    // Initialize Google GenAI SDK
    this.ai = new GoogleGenAI({ apiKey: this.config.apiKey });
  }

  /**
   * Generate video with automatic polling
   */
  async generate(
    input: VideoGenerationInput,
    onProgress?: ProgressCallback
  ): Promise<string | Blob> {
    // Start generation
    const operationName = await this.startGeneration(input);
    
    // Poll for completion
    return await this.pollForCompletion(operationName, onProgress);
  }

  /**
   * Start video generation and return operation name
   */
  async startGeneration(input: VideoGenerationInput): Promise<string> {
    try {
      // Use Google GenAI SDK to start generation
      const operation = await this.ai.models.generateVideos({
        model: this.config.model!,
        prompt: input.prompt,
        image: {
          imageBytes: input.imageData.base64,
          mimeType: input.imageData.mimeType,
        },
        config: { 
          numberOfVideos: 1,
          ...input.modelConfig 
        }
      });

      if (!operation.name) {
        throw new Error('No operation name returned from Gemini');
      }

      console.log('Gemini video generation started with operation:', operation.name);
      return operation.name;
    } catch (error) {
      console.error('Failed to start Gemini video generation:', error);
      throw error;
    }
  }

  /**
   * Poll for completion
   */
  async pollForCompletion(
    operationName: string,
    onProgress?: ProgressCallback
  ): Promise<string | Blob> {
    const startTime = Date.now();
    const maxPollingTime = this.config.maxPollingTime || 600000;
    const pollingInterval = this.config.pollingInterval || 5000;
    
    this.abortController = new AbortController();
    let attempts = 0;

    while (Date.now() - startTime < maxPollingTime) {
      // Check if cancelled
      if (this.abortController.signal.aborted) {
        throw new Error('Video generation cancelled');
      }

      // Wait before checking (except first iteration)
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }

      // Check status
      const status = await this.checkStatus(operationName);
      
      // Update progress
      if (onProgress) {
        const progress = Math.min(
          95, 
          Math.floor(((Date.now() - startTime) / maxPollingTime) * 100)
        );
        onProgress({ ...status, progress });
      }

      // Handle completion
      if (status.status === 'succeeded' && status.output) {
        if (onProgress) {
          onProgress({ ...status, progress: 100 });
        }
        return await this.processOutput(status.output);
      }

      // Handle failure
      if (status.status === 'failed' || status.status === 'canceled') {
        throw new Error(status.error || 'Video generation failed');
      }

      attempts++;
    }

    throw new Error(`Video generation timed out after ${maxPollingTime / 1000} seconds`);
  }

  /**
   * Check generation status using REST API
   */
  async checkStatus(operationName: string): Promise<PollingStatus> {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/';
    const url = `${baseUrl}${operationName}?key=${this.config.apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.error('Failed to check operation status:', response.statusText);
      return { status: 'failed' };
    }
    
    const operation = await response.json();
    
    console.log(`Gemini operation ${operationName} status: ${operation.done ? 'completed' : 'processing'}`);
    
    if (operation.error) {
      console.error('Gemini video generation error:', operation.error);
      return { 
        status: 'failed',
        error: operation.error.message || 'Generation failed'
      };
    }
    
    // Check for video URL in the REST API response
    if (operation.done && operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri) {
      const videoUrl = operation.response.generateVideoResponse.generatedSamples[0].video.uri;
      console.log('Found video URL:', videoUrl);
      // Add API key to the URL for authentication
      const authenticatedUrl = `${videoUrl}&key=${this.config.apiKey}`;
      return {
        status: 'succeeded',
        output: authenticatedUrl
      };
    }
    
    // Fallback: Check for SDK expected location
    if (operation.done && operation.response?.generatedVideos?.[0]?.video?.uri) {
      const videoUrl = operation.response.generatedVideos[0].video.uri;
      console.log('Found video URL (SDK path):', videoUrl);
      const authenticatedUrl = `${videoUrl}&key=${this.config.apiKey}`;
      return {
        status: 'succeeded',
        output: authenticatedUrl
      };
    }
    
    if (operation.done) {
      console.error('Operation completed but no video URL found');
      return { 
        status: 'failed',
        error: 'No video URL in response'
      };
    }
    
    return {
      status: 'processing'
    };
  }

  /**
   * Process output to desired format
   */
  private async processOutput(output: string | Blob): Promise<string | Blob> {
    const { outputFormat } = this.config;

    // If output is already a Blob
    if (output instanceof Blob) {
      if (outputFormat === 'blob') {
        return output;
      }
      if (outputFormat === 'url') {
        return URL.createObjectURL(output);
      }
      if (outputFormat === 'base64') {
        const arrayBuffer = await output.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array)
          .map(byte => String.fromCharCode(byte))
          .join('');
        const base64 = btoa(binaryString);
        return `data:video/mp4;base64,${base64}`;
      }
    }

    // If output is a string (URL)
    if (typeof output === 'string') {
      if (outputFormat === 'url') {
        return output;
      }

      // Fetch the video from URL
      const response = await fetch(output);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      if (outputFormat === 'blob') {
        return await response.blob();
      }

      if (outputFormat === 'base64') {
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array)
          .map(byte => String.fromCharCode(byte))
          .join('');
        const base64 = btoa(binaryString);
        return `data:video/mp4;base64,${base64}`;
      }
    }

    return output;
  }

  /**
   * Cancel ongoing generation
   */
  cancel(): void {
    this.abortController?.abort();
  }
}