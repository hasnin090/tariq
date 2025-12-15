import React, { useState, useEffect } from 'react';
import { activityLogService } from '../../../src/services/supabaseService';

interface ActivityLog {
    id: string;
    action: string;
    details: string;
    user_id: string;
    created_at: string;
    interface_mode?: string;
}

const SalesActivityLog: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            try {
                setLoading(true);
                // جلب سجلات المبيعات فقط
                const data = await activityLogService.getAll('projects');
                setLogs(data);
            } catch (error) {
                console.error('Error loading activity logs:', error);
            } finally {
                setLoading(false);
            }
        };
        loadLogs();
    }, []);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">سجل نشاطات المبيعات</h2>
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-slate-500">جاري التحميل...</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-right">
                            <thead>
                                <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التوقيت</th>
                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الإجراء</th>
                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b border-slate-200 dark:border-slate-700">
                                        <td className="p-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('ar-EG')}
                                        </td>
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{log.action}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {logs.length === 0 && <p className="p-8 text-center text-slate-500">لا توجد نشاطات مسجلة للمبيعات.</p>}
                    </>
                )}
            </div>
        </div>
    );
};

export default SalesActivityLog;
