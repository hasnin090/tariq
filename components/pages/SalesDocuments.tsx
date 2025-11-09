import React, { useState, useEffect } from 'react';
import { UnitSaleRecord, SaleDocument } from '../../types';
import { FileIcon, UploadIcon, DownloadIcon, TrashIcon } from '../shared/Icons';

const SalesDocuments: React.FC = () => {
    const [sales, setSales] = useState<UnitSaleRecord[]>([]);

    useEffect(() => {
        const allSales: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');
        setSales(allSales.filter(s => s.documents && s.documents.length > 0));
    }, []);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">مستندات البيع</h2>
            <div className="space-y-6">
                {sales.map(sale => (
                    <div key={sale.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-primary-700 dark:text-primary-400">{`عملية بيع: ${sale.unitName} - ${sale.customerName}`}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{`تاريخ البيع: ${sale.saleDate}`}</p>
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
                ))}
                 {sales.length === 0 && (
                     <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                        <h3 className="text-lg font-medium">لا توجد مستندات</h3>
                        <p className="mt-1 text-sm text-slate-500">لم يتم رفع أي مستندات لعمليات البيع بعد.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesDocuments;
