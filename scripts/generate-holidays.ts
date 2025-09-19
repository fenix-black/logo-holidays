import { GoogleGenAI, Type } from "@google/genai";
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Ensure we have the API key
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY environment variable not set");
    console.error("Make sure you have a .env.local file with GEMINI_API_KEY=your_key");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// List of supported countries
const SUPPORTED_COUNTRIES = ['USA', 'Chile'];

// Holiday interface matching the main app
interface Holiday {
    name_en: string;
    name_es: string;
    description_en: string;
    description_es: string;
    date: string;           // e.g., "December 25", "Fourth Thursday of November", "March-April (varies)"
    season: string;         // e.g., "Winter", "Spring", "Summer", "Fall"
    dateType: 'fixed' | 'variable' | 'lunar';  // Type of date calculation
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
 * Fetches complete holiday data for a country including dates and all details
 */
async function fetchCountryHolidays(country: string): Promise<Holiday[]> {
    console.log(`\n📍 Fetching holidays for ${country}...`);
    
    try {
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
        console.log(`✅ Fetched ${parsed.holidays.length} holidays for ${country}`);
        
        return parsed.holidays;
    } catch (error) {
        console.error(`❌ Error fetching holidays for ${country}:`, error);
        throw error;
    }
}

/**
 * Main function to generate the holiday database
 */
async function generateHolidayDatabase() {
    console.log('🎄 Holiday Data Generation Script');
    console.log('==================================\n');
    
    const database: HolidayDatabase = {
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        countries: {}
    };
    
    // Fetch data for each country
    for (const country of SUPPORTED_COUNTRIES) {
        try {
            const holidays = await fetchCountryHolidays(country);
            database.countries[country] = { holidays };
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`Failed to fetch data for ${country}, skipping...`);
        }
    }
    
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('\n📁 Created data directory');
    }
    
    const filePath = path.join(dataDir, 'holidays.json');
    
    // Backup existing file if it exists
    if (fs.existsSync(filePath)) {
        const backupPath = path.join(dataDir, 'holidays-backup.json');
        fs.copyFileSync(filePath, backupPath);
        console.log('\n💾 Backed up existing holidays.json to holidays-backup.json');
    }
    
    // Write new data
    fs.writeFileSync(filePath, JSON.stringify(database, null, 2));
    console.log(`\n✅ Holiday database saved to ${filePath}`);
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log('===========');
    for (const [country, data] of Object.entries(database.countries)) {
        console.log(`${country}: ${data.holidays.length} holidays`);
        data.holidays.forEach(h => {
            console.log(`  - ${h.name_en} (${h.date}, ${h.season})`);
        });
    }
    
    console.log('\n✨ Holiday data generation complete!');
}

// Run the script
generateHolidayDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
