import { NextRequest, NextResponse } from 'next/server';
import { fetchHolidayList } from '@/lib/gemini-server';
import { holidayService } from '@/lib/holiday-service';
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
    
    // Try to get holidays from the in-memory service first
    let holidays = holidayService.getHolidays(country);
    
    // If service doesn't have the data, fall back to Gemini API
    if (!holidays) {
      console.log(`Holiday service miss for ${country}, falling back to Gemini API`);
      holidays = await fetchHolidayList(country);
    } else {
      console.log(`✓ Serving holidays for ${country} from memory (v${holidayService.getDataVersion()})`);
    }
    
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
