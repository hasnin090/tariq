import React from 'react';

const ExpenseReports: React.FC = () => {
    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">تقارير المصروفات</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg">المصروفات حسب الفئة</h3>
                    <p className="text-sm text-slate-500 mb-4">توزيع المصروفات على الفئات المختلفة.</p>
                    <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg">المصروفات حسب المشروع</h3>
                    <p className="text-sm text-slate-500 mb-4">توزيع المصروفات على المشاريع.</p>
                     <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseReports;
