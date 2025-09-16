import { NextRequest, NextResponse } from 'next/server';
import { generateHolidayImage } from '@/lib/gemini-server';
import type { ApiResponse, Holiday, ImageDetails } from '@/lib/types';

export const maxDuration = 60; // Maximum allowed duration for Vercel hobby plan

export async function POST(request: NextRequest) {
  try {
    const { logoB64, logoMimeType, holiday, country, logoAnalysis, style, blankCanvasB64, blankCanvasMimeType } = await request.json();
    
    if (!logoB64 || !logoMimeType || !holiday || !country || !logoAnalysis) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }
    
    const image = await generateHolidayImage(
      logoB64,
      logoMimeType,
      holiday as Holiday,
      country,
      logoAnalysis,
      style || 'Default',
      blankCanvasB64,
      blankCanvasMimeType
    );
    
    return NextResponse.json<ApiResponse<ImageDetails>>({
      success: true,
      data: image
    });
  } catch (error) {
    console.error('Error in /api/generate-image:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image'
    }, { status: 500 });
  }
}
