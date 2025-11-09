import React from 'react';

const Reports: React.FC = () => {
    // In a real application, this would fetch data and render charts.
    // For now, it's a placeholder page.

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">التقارير</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sales Performance Report */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">أداء المبيعات</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">نظرة عامة على أداء المبيعات الشهري.</p>
                    <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>

                {/* Occupancy Report */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">تقرير الإشغال</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">نسبة الوحدات المتاحة، المحجوزة، والمباعة.</p>
                     <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>
                
                 {/* Revenue Report */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">تقرير الإيرادات</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">ملخص الإيرادات من المبيعات والدفعات.</p>
                     <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>
                
                 {/* Customer Activity Report */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">تقرير نشاط العملاء</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">تحليل العملاء الجدد والنشاط العام.</p>
                     <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
