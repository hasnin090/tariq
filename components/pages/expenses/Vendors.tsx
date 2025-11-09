import React, { useState, useEffect } from 'react';
import { Vendor } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import logActivity from '../../../utils/activityLogger';
import ConfirmModal from '../../shared/ConfirmModal';
import { CloseIcon } from '../../shared/Icons';

const Vendors: React.FC = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

    useEffect(() => {
        setVendors(JSON.parse(localStorage.getItem('vendors') || '[]'));
    }, []);

    const saveData = (data: Vendor[]) => {
        localStorage.setItem('vendors', JSON.stringify(data));
        setVendors(data);
    };

    const handleSave = (vendorData: Omit<Vendor, 'id'>) => {
        if (editingVendor) {
            const updated = vendors.map(v => v.id === editingVendor.id ? { ...editingVendor, ...vendorData } : v);
            saveData(updated);
        } else {
            const newVendor: Vendor = { id: `ven_${Date.now()}`, ...vendorData };
            saveData([...vendors, newVendor]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة الموردين</h2>
                <button onClick={() => { setEditingVendor(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700">إضافة مورد</button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right">
                    <thead><tr className="border-b-2 bg-slate-100 dark:bg-slate-700"><th className="p-4 font-bold text-sm">اسم الشركة</th><th className="p-4 font-bold text-sm">مسؤول التواصل</th><th className="p-4 font-bold text-sm">الهاتف</th><th className="p-4 font-bold text-sm">إجراءات</th></tr></thead>
                    <tbody>
                        {vendors.map(vendor => (
                            <tr key={vendor.id} className="border-b border-slate-200 dark:border-slate-700">
                                <td className="p-4 font-medium">{vendor.name}</td>
                                <td className="p-4">{vendor.contactPerson}</td>
                                <td className="p-4">{vendor.phone}</td>
                                <td className="p-4"><button onClick={() => { setEditingVendor(vendor); setIsModalOpen(true); }} className="text-primary-600 hover:underline font-semibold">تعديل</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <VendorPanel vendor={editingVendor} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

interface PanelProps { vendor: Vendor | null; onClose: () => void; onSave: (data: Omit<Vendor, 'id'>) => void; }

const VendorPanel: React.FC<PanelProps> = ({ vendor, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: vendor?.name || '',
        contactPerson: vendor?.contactPerson || '',
        phone: vendor?.phone || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            addToast('اسم الشركة مطلوب.', 'error');
            return;
        }
        onSave(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b flex justify-between items-start"><h2 className="text-xl font-bold">{vendor ? 'تعديل مورد' : 'إضافة مورد'}</h2><button type="button" onClick={onClose}><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="name" placeholder="اسم الشركة" value={formData.name} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" required />
                        <input type="text" name="contactPerson" placeholder="مسؤول التواصل" value={formData.contactPerson} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" />
                        <input type="tel" name="phone" placeholder="رقم الهاتف" value={formData.phone} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" />
                    </div>
                    <div className="px-6 py-4 border-t flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg font-semibold">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

export default Vendors;