/**
 * Test script to demonstrate retry mechanism with fallback models
 */

import { GeminiVideoGenerator } from './GeminiVideoGenerator';
import type { VideoGenerationInput } from './types';

async function testVideoGenerationWithRetry() {
  // Configure generator with fallback models
  const generator = new GeminiVideoGenerator({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key',
    model: 'veo-3.0-fast-generate-001', // Primary model
    fallbackModels: [
      'veo-3.0-fast-generate-preview', // Fallback 1
      'veo-2.0-fast-generate-001',      // Fallback 2  
    ],
    retryOnOverload: true,
    outputFormat: 'url',
    maxPollingTime: 600000, // 10 minutes
    pollingInterval: 5000   // 5 seconds
  });

  const input: VideoGenerationInput = {
    prompt: "A company logo transforms into a Christmas theme with falling snow",
    imageData: {
      base64: "base64_encoded_image_data_here",
      mimeType: "image/png"
    },
    modelConfig: {
      aspectRatio: "16:9",
      negativePrompt: "low quality, blurry"
    }
  };

  try {
    console.log('Starting video generation with automatic retry on overload...');
    
    // This will automatically retry with fallback models if primary is overloaded
    const operationName = await generator.startGeneration(input);
    console.log('Operation started:', operationName);
    
    // Poll for completion
    const result = await generator.pollForCompletion(
      operationName,
      (status) => {
        console.log('Progress:', status.progress, '% - Status:', status.status);
        if (status.error) {
          console.log('Error encountered:', status.error);
          if (status.isOverloadError) {
            console.log('Model overload detected - would retry with fallback model');
          }
        }
      }
    );
    
    console.log('Video generation completed!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Video generation failed:', error);
  }
}

// Example of how the retry mechanism works:
console.log(`
Retry Mechanism Behavior:
========================
1. First attempts with primary model: veo-3.0-fast-generate-001
2. If error code 14 (overloaded) is received, automatically retries with: veo-3.0-fast-generate-preview
3. If still overloaded, tries next fallback: veo-2.0-fast-generate-001
4. If all models fail, returns the error to the caller

The retry is transparent to the frontend - it happens automatically in the API layer.
`);

// Run test if this file is executed directly
if (require.main === module) {
  testVideoGenerationWithRetry();
}

export { testVideoGenerationWithRetry };
