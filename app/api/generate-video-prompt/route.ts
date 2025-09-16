import { NextRequest, NextResponse } from 'next/server';
import { generateVideoPromptJson } from '@/lib/gemini-server';
import type { ApiResponse, Holiday } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { holiday, country, style } = await request.json();
    
    if (!holiday || !country) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Holiday and country are required'
      }, { status: 400 });
    }
    
    const promptJson = await generateVideoPromptJson(
      holiday as Holiday,
      country,
      style || 'Default'
    );
    
    return NextResponse.json<ApiResponse<string>>({
      success: true,
      data: promptJson
    });
  } catch (error) {
    console.error('Error in /api/generate-video-prompt:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate video prompt'
    }, { status: 500 });
  }
}
