import { NextRequest, NextResponse } from 'next/server';
import { holidayService } from '@/lib/holiday-service';
import { GoogleGenAI, Type } from "@google/genai";
import * as fs from 'fs';
import * as path from 'path';
import type { ApiResponse } from '@/lib/types';

// List of supported countries
const SUPPORTED_COUNTRIES = ['USA', 'Chile'];

interface Holiday {
    name_en: string;
    name_es: string;
    description_en: string;
    description_es: string;
    date: string;
    season: string;
    dateType: 'fixed' | 'variable' | 'lunar';
    clothing?: string;
    elements?: string;
    visualSymbols?: string;
    locations?: string;
    timeOfDay?: string;
    activities?: string;
    colorPalette?: string;
    flagIsProminent?: boolean;
    soundEffects?: string;
    musicStyles?: string;
}

interface HolidayDatabase {
    version: string;
    generatedAt: string;
    lastUpdated: string;
    countries: {
        [country: string]: {
            holidays: Holiday[];
        };
    };
}

/**
 * Admin endpoint to refresh holiday data
 * Protected by ADMIN_SECRET environment variable
 * Can be called by Vercel cron or manually with the correct secret
 */
export async function POST(request: NextRequest) {
    try {
        // Check authorization
        const authHeader = request.headers.get('authorization');
        const urlSecret = request.nextUrl.searchParams.get('secret');
        const adminSecret = process.env.ADMIN_SECRET;
        
        if (!adminSecret) {
            console.error('ADMIN_SECRET not configured');
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Admin endpoint not configured'
            }, { status: 500 });
        }
        
        // Check if secret matches (either in header or query param)
        const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret;
        if (providedSecret !== adminSecret) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }
        
        console.log('🔄 Starting holiday data refresh...');
        
        // Ensure we have the Gemini API key
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Gemini API key not configured'
            }, { status: 500 });
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Create new database structure
        const database: HolidayDatabase = {
            version: "1.0.0",
            generatedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            countries: {}
        };
        
        // Fetch data for each country
        const errors: string[] = [];
        for (const country of SUPPORTED_COUNTRIES) {
            try {
                console.log(`Fetching holidays for ${country}...`);
                const holidays = await fetchCountryHolidays(ai, country);
                database.countries[country] = { holidays };
                console.log(`✓ Fetched ${holidays.length} holidays for ${country}`);
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                const errorMsg = `Failed to fetch holidays for ${country}: ${error}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }
        
        // Only proceed if we have data for at least one country
        if (Object.keys(database.countries).length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Failed to fetch data for any country',
                data: { errors }
            }, { status: 500 });
        }
        
        // Save to file
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const filePath = path.join(dataDir, 'holidays.json');
        
        // Backup existing file if it exists
        if (fs.existsSync(filePath)) {
            const backupPath = path.join(dataDir, 'holidays-backup.json');
            fs.copyFileSync(filePath, backupPath);
            console.log('✓ Backed up existing data');
        }
        
        // Write new data
        fs.writeFileSync(filePath, JSON.stringify(database, null, 2));
        console.log('✓ Saved new holiday data');
        
        // Reload the service with new data
        await holidayService.reload();
        console.log('✓ Reloaded holiday service');
        
        // Return success with summary
        const summary = {
            version: database.version,
            generatedAt: database.generatedAt,
            countries: Object.keys(database.countries).map(country => ({
                name: country,
                holidayCount: database.countries[country].holidays.length
            })),
            errors: errors.length > 0 ? errors : undefined
        };
        
        return NextResponse.json<ApiResponse>({
            success: true,
            data: summary
        });
        
    } catch (error) {
        console.error('Error in refresh-holidays endpoint:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to refresh holiday data'
        }, { status: 500 });
    }
}

/**
 * Helper function to fetch holidays for a country
 */
async function fetchCountryHolidays(ai: GoogleGenAI, country: string): Promise<Holiday[]> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: `You are a cultural expert and cinematographer. List the top 8 most popular and visually distinct holidays celebrated in ${country}.

For each holiday, provide COMPLETE information including:

1. BASIC INFO:
- Name in English and Spanish
- Description in English and Spanish (one sentence each)

2. DATE INFORMATION:
- date: When it occurs (e.g., "December 25", "Fourth Thursday of November", "Early April - varies by lunar calendar")
- season: The season when celebrated (Winter/Spring/Summer/Fall for Northern Hemisphere, adjust for Southern)
- dateType: "fixed" for same date yearly, "variable" for moveable dates, "lunar" for lunar calendar based

3. VISUAL & CULTURAL DETAILS (for video production):
- clothing: Traditional attire worn
- elements: Key decorative elements and props
- visualSymbols: Important visual symbols and motifs
- locations: Typical celebration venues
- timeOfDay: When key celebrations happen
- activities: Traditional activities and rituals
- colorPalette: Traditional colors
- flagIsProminent: Whether the national flag is prominently featured (boolean)
- soundEffects: Typical ambient sounds
- musicStyles: Traditional music genres and instruments

Focus on the most culturally significant and visually interesting celebrations.
Provide authentic, production-ready details for each holiday.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    holidays: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name_en: { type: Type.STRING },
                                name_es: { type: Type.STRING },
                                description_en: { type: Type.STRING },
                                description_es: { type: Type.STRING },
                                date: { type: Type.STRING },
                                season: { type: Type.STRING },
                                dateType: { 
                                    type: Type.STRING,
                                    enum: ["fixed", "variable", "lunar"]
                                },
                                clothing: { type: Type.STRING },
                                elements: { type: Type.STRING },
                                visualSymbols: { type: Type.STRING },
                                locations: { type: Type.STRING },
                                timeOfDay: { type: Type.STRING },
                                activities: { type: Type.STRING },
                                colorPalette: { type: Type.STRING },
                                flagIsProminent: { type: Type.BOOLEAN },
                                soundEffects: { type: Type.STRING },
                                musicStyles: { type: Type.STRING },
                            },
                            required: [
                                "name_en", "name_es", "description_en", "description_es",
                                "date", "season", "dateType", "clothing", "elements",
                                "visualSymbols", "locations", "timeOfDay", "activities",
                                "colorPalette", "flagIsProminent", "soundEffects", "musicStyles"
                            ]
                        },
                    },
                },
            },
        },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
        throw new Error("No response received from AI");
    }
    
    const parsed = JSON.parse(jsonStr);
    return parsed.holidays;
}

/**
 * GET endpoint to check the status of the holiday data
 */
export async function GET(request: NextRequest) {
    // This endpoint doesn't require authentication - just returns status
    try {
        const isReady = holidayService.isReady();
        const version = holidayService.getDataVersion();
        const lastUpdated = holidayService.getLastUpdated();
        const countries = holidayService.getSupportedCountries();
        
        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                serviceReady: isReady,
                dataVersion: version,
                lastUpdated: lastUpdated,
                supportedCountries: countries,
                holidayCount: countries.reduce((acc, country) => {
                    const holidays = holidayService.getHolidays(country);
                    return acc + (holidays?.length || 0);
                }, 0)
            }
        });
    } catch (error) {
        return NextResponse.json<ApiResponse>({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get status'
        }, { status: 500 });
    }
}
