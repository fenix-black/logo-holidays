/**
 * Example usage of GeminiVideoGenerator
 */

import { GeminiVideoGenerator } from './GeminiVideoGenerator';

async function example() {
  // Initialize the generator
  const videoGen = new GeminiVideoGenerator({
    apiKey: process.env.GOOGLE_GENAI_API_KEY!,
    model: 'models/video-01', // VEO3
    maxPollingTime: 300000, // 5 minutes
    pollingInterval: 5000, // 5 seconds
    outputFormat: 'blob'
  });

  try {
    // Generate video with progress tracking
    const result = await videoGen.generate(
      {
        prompt: "A serene landscape transforming through seasons",
        imageData: {
          base64: "...", // Your base64 image data (without data URI prefix)
          mimeType: "image/jpeg"
        }
      },
      (status) => {
        console.log(`Status: ${status.status}`);
        if (status.progress) {
          console.log(`Progress: ${status.progress}%`);
        }
      }
    );

    // Handle result based on output format
    if (result instanceof Blob) {
      const videoUrl = URL.createObjectURL(result);
      console.log('Video ready:', videoUrl);
    } else {
      console.log('Video ready:', result);
    }

  } catch (error) {
    console.error('Video generation failed:', error);
  }
}
