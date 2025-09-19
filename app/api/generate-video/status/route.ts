import { NextRequest, NextResponse } from 'next/server';
import { GeminiVideoGenerator } from '@/shared/gemini-video-generator';
import type { ApiResponse } from '@/lib/types';

interface VideoStatusResponse {
  status: 'processing' | 'succeeded' | 'failed';
  progress?: number;
  videoUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { operationName } = await request.json();
    
    if (!operationName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Operation name is required'
      }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Gemini API key not configured'
      }, { status: 500 });
    }
    
    // Initialize the generator
    const generator = new GeminiVideoGenerator({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'veo-3.0-fast-generate-001',
      outputFormat: 'url'
    });
    
    // Use the public checkStatus method
    const status = await generator.checkStatus(operationName);
    
    // Handle different status responses
    if (status.status === 'failed') {
      return NextResponse.json<ApiResponse<VideoStatusResponse>>({
        success: true,
        data: { 
          status: 'failed',
          error: status.error || 'Video generation failed'
        }
      });
    }
    
    if (status.status === 'succeeded' && status.output) {
      // The output is the authenticated URL
      // Fetch the video and convert to base64
      const videoResponse = await fetch(status.output);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }
      
      const arrayBuffer = await videoResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      return NextResponse.json<ApiResponse<VideoStatusResponse>>({
        success: true,
        data: {
          status: 'succeeded',
          progress: 100,
          videoUrl: base64 // Return base64 to match existing frontend expectation
        }
      });
    }
    
    // Still processing - calculate a simple progress estimate
    // You could enhance this by tracking time since start if needed
    const progress = status.progress || 50;
    
    return NextResponse.json<ApiResponse<VideoStatusResponse>>({
      success: true,
      data: {
        status: 'processing',
        progress
      }
    });
    
  } catch (error) {
    console.error('Error in /api/generate-video/status:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check video status'
    }, { status: 500 });
  }
}
