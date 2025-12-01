-- Clean Up Invalid Currency Codes in Database
-- Run this in Supabase SQL Editor to fix all invalid currency codes

-- 1. First, let's see what invalid currency codes exist
SELECT key, value 
FROM settings 
WHERE key = 'systemCurrency' 
AND (value IS NULL OR length(value) != 3 OR value !~ '^[A-Z]{3}$');

-- 2. Update invalid currency codes to IQD
UPDATE settings 
SET value = 'IQD', 
    updated_at = NOW()
WHERE key = 'systemCurrency' 
AND (value IS NULL OR length(value) != 3 OR value !~ '^[A-Z]{3}$');

-- 3. If no systemCurrency exists, insert it
INSERT INTO settings (key, value, updated_at)
VALUES ('systemCurrency', 'IQD', NOW())
ON CONFLICT (key) DO NOTHING;

-- 4. Verify the fix
SELECT key, value, updated_at 
FROM settings 
WHERE key = 'systemCurrency';

-- Expected result: systemCurrency = 'IQD' (or another valid 3-letter code)
