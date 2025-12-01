import { supabase } from '../src/lib/supabase';

/**
 * One-time cleanup script to fix invalid currency codes
 * Run this once to clean up database and localStorage
 */

const cleanupInvalidCurrency = async () => {
    console.log('🧹 Starting currency cleanup...');
    
    try {
        // 1. Get current currency from database
        const { data: currentSetting, error: getError } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'systemCurrency')
            .single();

        if (getError && getError.code !== 'PGRST116') {
            console.error('Error fetching currency:', getError);
        }

        const currentCurrency = currentSetting?.value;
        console.log('Current currency in DB:', currentCurrency);

        // 2. Check if it's valid (3 uppercase letters)
        const isValidCurrency = currentCurrency && /^[A-Z]{3}$/.test(currentCurrency);

        if (!isValidCurrency) {
            console.log('❌ Invalid currency detected:', currentCurrency);
            console.log('🔧 Fixing to IQD...');

            // Update in database
            const { error: updateError } = await supabase
                .from('settings')
                .upsert({ 
                    key: 'systemCurrency', 
                    value: 'IQD',
                    updated_at: new Date().toISOString()
                });

            if (updateError) {
                console.error('Error updating currency:', updateError);
                return false;
            }

            console.log('✅ Database updated to IQD');
        } else {
            console.log('✅ Currency is valid:', currentCurrency);
        }

        // 3. Clean localStorage
        const localCurrency = localStorage.getItem('systemCurrency');
        console.log('Current currency in localStorage:', localCurrency);

        if (!localCurrency || !/^[A-Z]{3}$/.test(localCurrency)) {
            console.log('🔧 Cleaning localStorage...');
            localStorage.removeItem('systemCurrency');
            localStorage.setItem('systemCurrency', isValidCurrency ? currentCurrency : 'IQD');
            console.log('✅ localStorage cleaned');
        }

        // 4. Refresh the page to apply changes
        console.log('✅ Cleanup complete!');
        console.log('🔄 Refreshing page in 2 seconds...');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);

        return true;

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        return false;
    }
};

// Auto-run on import (for one-time execution)
if (typeof window !== 'undefined') {
    console.log('='.repeat(50));
    console.log('CURRENCY CLEANUP UTILITY');
    console.log('='.repeat(50));
    
    // Check if cleanup already ran
    const cleanupRan = sessionStorage.getItem('currency_cleanup_ran');
    
    if (!cleanupRan) {
        cleanupInvalidCurrency().then(success => {
            if (success) {
                sessionStorage.setItem('currency_cleanup_ran', 'true');
            }
        });
    } else {
        console.log('ℹ️ Cleanup already ran in this session');
    }
}

export default cleanupInvalidCurrency;
