import { NextRequest, NextResponse } from 'next/server';
import { refineVideoPromptJson } from '@/lib/gemini-server';
import type { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { currentJson, userInstructions } = await request.json();
    
    if (!currentJson || !userInstructions) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Current JSON and user instructions are required'
      }, { status: 400 });
    }
    
    const refinedJson = await refineVideoPromptJson(currentJson, userInstructions);
    
    return NextResponse.json<ApiResponse<string>>({
      success: true,
      data: refinedJson
    });
  } catch (error) {
    console.error('Error in /api/refine-video-prompt:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refine video prompt'
    }, { status: 500 });
  }
}
