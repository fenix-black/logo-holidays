import { NextRequest, NextResponse } from 'next/server';
import { fetchHolidays } from '@/lib/gemini-server';
import type { ApiResponse, Holiday } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { country } = await request.json();
    
    if (!country) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Country is required'
      }, { status: 400 });
    }
    
    const holidays = await fetchHolidays(country);
    
    return NextResponse.json<ApiResponse<Holiday[]>>({
      success: true,
      data: holidays
    });
  } catch (error) {
    console.error('Error in /api/holidays:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch holidays'
    }, { status: 500 });
  }
}
