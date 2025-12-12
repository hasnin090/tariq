import React, { useState, useEffect, useMemo } from 'react';
import { UnitSaleRecord, SaleDocument, Unit } from '../../../types';
import { FileIcon, UploadIcon, DownloadIcon, TrashIcon } from '../../shared/Icons';
import { useProject } from '../../../contexts/ProjectContext';
import ProjectSelector from '../../shared/ProjectSelector';
import { unitsService } from '../../../src/services/supabaseService';

const SalesDocuments: React.FC = () => {
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const [sales, setSales] = useState<UnitSaleRecord[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const allSales: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');
            const unitsData = await unitsService.getAll();
            
            setSales(allSales.filter(s => s.documents && s.documents.length > 0));
            setUnits(unitsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter sales by active project
    const filteredSales = useMemo(() => {
        if (!activeProject) return sales;
        
        return sales.filter(sale => {
            const unit = units.find(u => u.id === sale.unitId);
            return unit?.projectId === activeProject.id;
        });
    }, [sales, units, activeProject]);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">مستندات البيع</h2>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject} 
            />
            
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
            <div className="space-y-6">
                {filteredSales.map(sale => (
                    <div key={sale.id} className="glass-card p-6">
                        <h3 className="font-bold text-lg text-white">{`${sale.unitName} - ${sale.customerName}`}</h3>
                        <p className="text-sm text-slate-300 mb-4">{`${sale.saleDate}`}</p>
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                            {(sale.documents || []).map(doc => (
                                <li key={doc.id} className="py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileIcon mimeType={doc.mimeType} className="h-6 w-6" />
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{doc.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{doc.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"><DownloadIcon className="h-5 w-5"/></button>
                                        <button className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 dark:text-rose-400"><TrashIcon className="h-5 w-5"/></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))})
                 {filteredSales.length === 0 && (
                     <div className="text-center py-16 glass-card border-2 border-dashed border-white/20">
                        <h3 className="text-lg font-medium text-white">لا توجد مستندات</h3>
                        <p className="mt-1 text-sm text-slate-300">لم يتم رفع أي مستندات لعمليات البيع بعد.</p>
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

export default SalesDocuments;
