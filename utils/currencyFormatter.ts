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
        console.error('Failed to refresh currency cache:', error);
    }
};

export const formatCurrency = (amount: number): string => {
    // Use cached values or defaults
    const decimalPlaces = cachedDecimalPlaces ?? parseInt((localStorage.getItem('systemDecimalPlaces') || '2'), 10);
    const currencyCode = cachedCurrency ?? (localStorage.getItem('systemCurrency') || 'IQD');
    
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    }).format(amount);
};