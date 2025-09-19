import { NextRequest, NextResponse } from 'next/server';
import { GeminiVideoGenerator } from '@/shared/gemini-video-generator';
import type { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { imageB64, imageMimeType, prompt } = await request.json();
    
    if (!imageB64 || !imageMimeType || !prompt) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Image data and prompt are required'
      }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Gemini API key not configured'
      }, { status: 500 });
    }
    
    // Initialize the generator with primary model and fallbacks
    const generator = new GeminiVideoGenerator({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'veo-3.0-fast-generate-001', // Primary model
      fallbackModels: [
        'veo-3.0-fast-generate-preview',  // First fallback
        'veo-2.0-fast-generate-001',       // Second fallback if available
      ],
      retryOnOverload: true, // Enable automatic retry on overload
      outputFormat: 'url'
    });

    // Use the public startGeneration method
    const operationName = await generator.startGeneration({
      prompt: prompt,
      imageData: {
        base64: imageB64,
        mimeType: imageMimeType
      },
      modelConfig: {
        aspectRatio: "16:9",
        negativePrompt: "low quality, pixelated, blurry, deformed logo, distorted logo, logo disappearing, logo fading out, logo leaving frame, obscured logo, hidden logo, warped branding, incorrect flag colors, inverted flag, distorted national symbols, deformed faces, uncanny valley, creepy expressions, distorted hands, extra limbs, morphing objects, inconsistent lighting, jarring transitions, abrupt cuts, audio desync, flickering, glitchy effects, culturally inaccurate clothing, wrong traditional attire, inappropriate gestures, child-like features, oversaturated, washed out colors, amateur composition, shaky camera, motion blur on logo, text artifacts, watermarks, inappropriate content"
      }
    });

    console.log('Video generation started with operation:', operationName);
    
    return NextResponse.json<ApiResponse<{ operationName: string }>>({
      success: true,
      data: { operationName }
    });
  } catch (error) {
    console.error('Error in /api/generate-video/start:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start video generation'
    }, { status: 500 });
  }
}
