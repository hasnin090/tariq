import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables manually
const envPath = path.resolve(__dirname, '../.env');
console.log('📂 Looking for .env at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('✅ .env file found');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = value;
        }
    });
} else {
    console.warn('⚠️ .env file not found at', envPath);
}

// Fallback values from src/lib/supabase.ts
const FALLBACK_URL = 'https://dlxtduzxlwogpwxjeqxm.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseHRkdXp4bHdvZ3B3eGplcXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTY3NTgsImV4cCI6MjA3MTI5Mjc1OH0.2sIjKRdzd2pXn9eg1gZR27PQ-tTjYxHAPeVybjyhhIs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

console.log('🔑 VITE_SUPABASE_URL:', supabaseUrl ? 'Found (or Fallback)' : 'Missing');
console.log('🔑 VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Found (or Fallback)' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    console.log('🔄 Checking database connection...');

    try {
        // 1. Check basic connection via health check function (if exists) or simple query
        const { data: healthData, error: healthError } = await supabase.rpc('check_db_health');

        if (healthError) {
            console.log('⚠️ Health check function not found or error (might need to run fix script):', healthError.message);
            // Fallback to simple table query
            const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
            if (error) throw error;
            console.log('✅ Basic connection successful (via users table check)');
        } else {
            console.log('✅ Database health check passed:', healthData);
        }

        // 2. Verify required tables exist
        const requiredTables = [
            'users', 'projects', 'accounts', 'transactions',
            'units', 'customers', 'bookings', 'payments',
            'expenses', 'vendors'
        ];

        console.log('\n🔄 Verifying tables...');
        const missingTables = [];

        for (const table of requiredTables) {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error) {
                if (error.code === '42P01') { // undefined_table
                    missingTables.push(table);
                    console.error(`❌ Table missing: ${table}`);
                } else {
                    console.log(`⚠️ Error checking table ${table}: ${error.message}`);
                }
            } else {
                console.log(`✅ Table exists: ${table}`);
            }
        }

        if (missingTables.length > 0) {
            console.error('\n❌ CRITICAL: The following tables are missing:', missingTables.join(', '));
            console.log('👉 Please run the database setup scripts.');
        } else {
            console.log('\n✅ All core tables verified.');
        }

        // 3. Test Triggers (Simulation)
        console.log('\n🔄 Verifying Triggers (Simulation)...');
        console.log('👉 To fully verify triggers, please run the application and perform actions:');
        console.log('   1. Create a transaction -> Check account balance update');
        console.log('   2. Create a booking -> Check unit status update');
        console.log('   3. Add a payment -> Check booking paid amount update');

    } catch (error: any) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

checkConnection();
