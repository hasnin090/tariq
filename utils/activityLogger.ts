import { ActivityLogEntry, User } from '../types.ts';

const logActivity = (action: string, details: string) => {
    const logs: ActivityLogEntry[] = JSON.parse(localStorage.getItem('activityLog') || '[]');
    
    let currentUser: User | null = null;
    try {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
        }
    } catch (error) {
        console.error("Failed to parse current user from session storage", error);
    }
    
    const newLog: ActivityLogEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        user: currentUser?.name || 'System',
        action,
        details,
    };

    logs.push(newLog);
    localStorage.setItem('activityLog', JSON.stringify(logs));
};

export default logActivity;
