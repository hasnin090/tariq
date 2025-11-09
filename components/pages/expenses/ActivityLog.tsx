import React, { useState, useEffect } from 'react';
import { ActivityLogEntry } from '../../../types';

const ActivityLog: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);

    useEffect(() => {
        const storedLogs: ActivityLogEntry[] = JSON.parse(localStorage.getItem('activityLog') || '[]');
        // sort logs descending by timestamp
        storedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(storedLogs);
    }, []);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">سجل النشاطات</h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التوقيت</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المستخدم</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الإجراء</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className="border-b border-slate-200 dark:border-slate-700">
                                <td className="p-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleString('ar-EG')}
                                </td>
                                <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{log.user}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{log.action}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {logs.length === 0 && <p className="p-8 text-center text-slate-500">لا توجد نشاطات مسجلة.</p>}
            </div>
        </div>
    );
};

export default ActivityLog;