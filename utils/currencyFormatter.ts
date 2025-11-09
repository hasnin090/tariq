

export const formatCurrency = (amount: number): string => {
    const currencyCode = localStorage.getItem('systemCurrency') || 'IQD';
    const decimalPlaces = parseInt(localStorage.getItem('systemDecimalPlaces') || '2', 10);
    
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    }).format(amount);
};