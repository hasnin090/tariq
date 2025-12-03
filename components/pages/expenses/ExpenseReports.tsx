import React from 'react';

const ExpenseReports: React.FC = () => {
    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">تقارير المصروفات</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 p-6 rounded-xl shadow-lg border border-white/20 dark:border-white/10">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">المصروفات حسب الفئة</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">توزيع المصروفات على الفئات المختلفة.</p>
                    <div className="h-64 bg-slate-100/50 dark:bg-slate-700/30 rounded-lg flex items-center justify-center border border-white/20">
                        <p className="text-slate-600 dark:text-slate-400">Chart will be displayed here.</p>
                    </div>
                </div>

                <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 p-6 rounded-xl shadow-lg border border-white/20 dark:border-white/10">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">المصروفات حسب المشروع</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">توزيع المصروفات على المشاريع.</p>
                     <div className="h-64 bg-slate-100/50 dark:bg-slate-700/30 rounded-lg flex items-center justify-center border border-white/20">
                        <p className="text-slate-600 dark:text-slate-400">Chart will be displayed here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseReports;
