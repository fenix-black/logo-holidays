import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/lib/gemini-server';
import type { ApiResponse } from '@/lib/types';

export const maxDuration = 300; // 5 minutes for video generation

export async function POST(request: NextRequest) {
  try {
    const { imageB64, imageMimeType, prompt } = await request.json();
    
    if (!imageB64 || !imageMimeType || !prompt) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Image data and prompt are required'
      }, { status: 400 });
    }
    
    const videoBase64 = await generateVideo(imageB64, imageMimeType, prompt);
    
    return NextResponse.json<ApiResponse<string>>({
      success: true,
      data: videoBase64
    });
  } catch (error) {
    console.error('Error in /api/generate-video:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate video'
    }, { status: 500 });
  }
}
