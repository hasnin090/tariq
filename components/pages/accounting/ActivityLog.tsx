import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ActivityLogEntry } from '../../../types';

const ActivityLog: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        const storedLogs: ActivityLogEntry[] = JSON.parse(localStorage.getItem('activityLog') || '[]');
        // sort logs descending by timestamp
        storedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(storedLogs);
    }, []);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && logs.length > 0 && !hasAnimated.current) {
            hasAnimated.current = true;
            const rows = tableBodyRef.current.querySelectorAll('tr');
            gsap.fromTo(rows,
                { opacity: 0, y: 15, x: -10 },
                {
                    opacity: 1,
                    y: 0,
                    x: 0,
                    duration: 0.35,
                    stagger: 0.04,
                    ease: "power2.out",
                    delay: 0.1
                }
            );
        }
    }, [logs]);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">سجل النشاطات</h2>
            <div className="glass-card overflow-hidden">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التوقيت</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المستخدم</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الإجراء</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody ref={tableBodyRef}>
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