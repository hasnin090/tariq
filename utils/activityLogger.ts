import { ActivityLogEntry, User } from '../types.ts';
import { activityLogService } from '../src/services/supabaseService';

const logActivity = async (action: string, details: string) => {
    let currentUser: User | null = null;
    try {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
        }
    } catch (error) {
        console.error("Failed to parse current user from session storage", error);
    }

    try {
        await activityLogService.log(action, details, currentUser?.id);
    } catch (error) {
        console.error('Failed to log activity to Supabase:', error);
        // Fallback to localStorage if Supabase fails
        const logs: ActivityLogEntry[] = JSON.parse(localStorage.getItem('activityLog') || '[]');
        const newLog: ActivityLogEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            user: currentUser?.name || 'System',
            action,
            details,
        };
        logs.push(newLog);
        localStorage.setItem('activityLog', JSON.stringify(logs));
    }
};

export default logActivity;
