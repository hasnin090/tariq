import React from 'react';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelector from '../shared/ProjectSelector';

const Reports: React.FC = () => {
    const { activeProject, availableProjects, setActiveProject } = useProject();
    // In a real application, this would fetch data and render charts.
    // For now, it's a placeholder page with project filtering UI.

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">التقارير</h2>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject} 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sales Performance Report */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-lg text-white">أداء المبيعات</h3>
                    <p className="text-sm text-slate-300 mb-4">نظرة عامة</p>
                    <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>

                {/* Occupancy Report */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-lg text-white">تقرير الإشغال</h3>
                    <p className="text-sm text-slate-300 mb-4">نسبة الوحدات</p>
                     <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>
                
                 {/* Revenue Report */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-lg text-white">تقرير الإيرادات</h3>
                    <p className="text-sm text-slate-300 mb-4">ملخص الإيرادات</p>
                     <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>
                
                 {/* Customer Activity Report */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-lg text-white">تقرير نشاط العملاء</h3>
                    <p className="text-sm text-slate-300 mb-4">تحليل العملاء</p>
                     <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
