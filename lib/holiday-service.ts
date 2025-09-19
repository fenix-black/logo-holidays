import * as fs from 'fs';
import * as path from 'path';
import type { Holiday } from './types';

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
 * Singleton service for managing holiday data in memory
 */
class HolidayService {
    private static instance: HolidayService;
    private holidayData: HolidayDatabase | null = null;
    private dataPath: string;
    private initialized: boolean = false;

    private constructor() {
        // Path to the holiday data file
        this.dataPath = path.join(process.cwd(), 'data', 'holidays.json');
    }

    /**
     * Gets the singleton instance
     */
    public static getInstance(): HolidayService {
        if (!HolidayService.instance) {
            HolidayService.instance = new HolidayService();
        }
        return HolidayService.instance;
    }

    /**
     * Initializes the service by loading data into memory
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('✓ Holiday service already initialized');
            return;
        }

        try {
            await this.loadData();
            this.initialized = true;
            console.log('✓ Holiday service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize holiday service:', error);
            // Don't throw - service can still fall back to API calls
            this.initialized = false;
        }
    }

    /**
     * Loads holiday data from the JSON file
     */
    private async loadData(): Promise<void> {
        try {
            // Check if file exists
            if (!fs.existsSync(this.dataPath)) {
                console.warn('Holiday data file not found at:', this.dataPath);
                console.log('Run "npm run generate-holidays" to create the data file');
                this.holidayData = null;
                return;
            }

            // Read and parse the JSON file
            const fileContent = fs.readFileSync(this.dataPath, 'utf-8');
            this.holidayData = JSON.parse(fileContent);
            
            console.log(`✓ Loaded holiday data v${this.holidayData?.version} from ${this.dataPath}`);
            console.log(`  Countries: ${Object.keys(this.holidayData?.countries || {}).join(', ')}`);
        } catch (error) {
            console.error('Error loading holiday data:', error);
            this.holidayData = null;
            throw error;
        }
    }

    /**
     * Reloads the holiday data from disk
     */
    public async reload(): Promise<void> {
        console.log('Reloading holiday data...');
        await this.loadData();
    }

    /**
     * Gets holidays for a specific country
     * @param country - Country name (e.g., 'USA', 'Chile')
     * @returns Array of holidays for the country
     */
    public getHolidays(country: string): Holiday[] | null {
        if (!this.holidayData) {
            console.warn('Holiday data not loaded, falling back to API');
            return null;
        }

        const countryData = this.holidayData.countries[country];
        if (!countryData) {
            console.warn(`No holiday data found for country: ${country}`);
            return null;
        }

        // Return a shallow copy to prevent external modifications
        return [...countryData.holidays];
    }

    /**
     * Gets details for a specific holiday
     * @param country - Country name
     * @param holidayName - Holiday name in English
     * @returns Holiday details or null if not found
     */
    public getHolidayDetails(country: string, holidayName: string): Holiday | null {
        const holidays = this.getHolidays(country);
        if (!holidays) return null;

        const holiday = holidays.find(h => h.name_en === holidayName);
        if (!holiday) {
            console.warn(`Holiday not found: ${holidayName} in ${country}`);
            return null;
        }

        // Return a copy to prevent external modifications
        return { ...holiday };
    }

    /**
     * Gets the current data version
     */
    public getDataVersion(): string | null {
        return this.holidayData?.version || null;
    }

    /**
     * Gets the last update timestamp
     */
    public getLastUpdated(): string | null {
        return this.holidayData?.lastUpdated || null;
    }

    /**
     * Gets list of supported countries
     */
    public getSupportedCountries(): string[] {
        if (!this.holidayData) return [];
        return Object.keys(this.holidayData.countries);
    }

    /**
     * Checks if the service is properly initialized with data
     */
    public isReady(): boolean {
        return this.initialized && this.holidayData !== null;
    }

    /**
     * Gets holidays sorted by upcoming dates (for future enhancement)
     * This is a placeholder for future functionality
     */
    public getHolidaysSortedByDate(country: string): Holiday[] | null {
        const holidays = this.getHolidays(country);
        if (!holidays) return null;

        // For now, return as-is. In the future, this could sort by actual dates
        // considering the current date and dateType (fixed/variable/lunar)
        return holidays;
    }
}

// Export singleton instance
export const holidayService = HolidayService.getInstance();

// Initialize on module load if in production/development
// Skip in test environment to avoid side effects
if (process.env.NODE_ENV !== 'test') {
    holidayService.initialize().catch(error => {
        console.error('Failed to initialize holiday service on module load:', error);
    });
}
