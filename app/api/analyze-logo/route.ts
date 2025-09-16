import { NextRequest, NextResponse } from 'next/server';
import { analyzeLogoStyle } from '@/lib/gemini-server';
import type { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { logoB64, logoMimeType } = await request.json();
    
    if (!logoB64 || !logoMimeType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Logo base64 and MIME type are required'
      }, { status: 400 });
    }
    
    const analysis = await analyzeLogoStyle(logoB64, logoMimeType);
    
    return NextResponse.json<ApiResponse<string>>({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error in /api/analyze-logo:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze logo'
    }, { status: 500 });
  }
}
