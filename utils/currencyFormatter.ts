import { devError, devWarn } from './devLogger';

// Currency formatter with dynamic decimal places from settings
let cachedDecimalPlaces: number | null = null;
let cachedCurrency: string | null = null;

// Function to refresh cache (call this when settings change)
export const refreshCurrencyCache = async () => {
    try {
        const { settingsService } = await import('../src/services/supabaseService');
        const decimalPlacesData = await settingsService.get('systemDecimalPlaces');
        const currencyData = await settingsService.get('systemCurrency');
        cachedDecimalPlaces = decimalPlacesData ? parseInt(decimalPlacesData, 10) : 2;
        cachedCurrency = currencyData || 'IQD';
    } catch (error) {
        devError(error, 'refreshCurrencyCache');
    }
};

export const formatCurrency = (amount: number): string => {
    // Use cached values or defaults
    const decimalPlaces = cachedDecimalPlaces ?? parseInt((localStorage.getItem('systemDecimalPlaces') || '2'), 10);
    let currencyCode = cachedCurrency ?? (localStorage.getItem('systemCurrency') || 'IQD');
    
    // Validate currency code - must be exactly 3 letters (ISO 4217)
    if (!currencyCode || currencyCode.length !== 3 || !/^[A-Z]{3}$/.test(currencyCode)) {
        devWarn(`Invalid currency code: ${currencyCode}, falling back to IQD`);
        currencyCode = 'IQD';
    }
    
    try {
        // استخدام الأرقام اللاتينية (الإنجليزية) لتجنب مشاكل RTL مع الأرقام العربية
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(amount);
        
        // إضافة رمز العملة بشكل يدوي
        const currencySymbols: Record<string, string> = {
            'IQD': 'د.ع',
            'USD': '$',
            'EUR': '€',
            'SAR': 'ر.س',
            'AED': 'د.إ',
            'KWD': 'د.ك',
            'JOD': 'د.أ',
            'EGP': 'ج.م',
            'SYP': 'ل.س',
            'LBP': 'ل.ل',
        };
        
        const symbol = currencySymbols[currencyCode] || currencyCode;
        return `${formatted} ${symbol}`;
    } catch (error) {
        devError(error, `formatCurrency with code ${currencyCode}`);
        // Fallback to simple formatting
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(amount);
        return `${formatted} د.ع`;
    }
};