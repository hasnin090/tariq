import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import logActivity from '../../utils/activityLogger';
import ConfirmModal from '../shared/ConfirmModal';
import { CloseIcon, UsersIcon, CustomersEmptyIcon } from '../shared/Icons';
import EmptyState from '../shared/EmptyState';

const Customers: React.FC = () => {
    const { currentUser } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    const canEdit = currentUser?.role === 'Admin' || currentUser?.permissions?.canEdit;
    const canDelete = currentUser?.role === 'Admin' || currentUser?.permissions?.canDelete;

    useEffect(() => {
        setCustomers(JSON.parse(localStorage.getItem('customers') || '[]'));
    }, []);

    const saveData = (data: Customer[]) => {
        localStorage.setItem('customers', JSON.stringify(data));
        setCustomers(data);
    };

    const handleOpenModal = (customer: Customer | null) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingCustomer(null);
        setIsModalOpen(false);
    };

    const handleSave = (customerData: Omit<Customer, 'id'>) => {
        if (editingCustomer) {
            const updated = customers.map(c => c.id === editingCustomer.id ? { ...editingCustomer, ...customerData } : c);
            saveData(updated);
            logActivity('Update Customer', `Updated customer: ${customerData.name}`);
        } else {
            const newCustomer: Customer = { id: `c_${Date.now()}`, ...customerData };
            saveData([...customers, newCustomer]);
            logActivity('Add Customer', `Added customer: ${newCustomer.name}`);
        }
        handleCloseModal();
    };

    const handleDelete = (customer: Customer) => {
        setCustomerToDelete(customer);
    };

    const confirmDelete = () => {
        if (customerToDelete) {
            const updated = customers.filter(c => c.id !== customerToDelete.id);
            saveData(updated);
            logActivity('Delete Customer', `Deleted customer: ${customerToDelete.name}`);
            setCustomerToDelete(null);
        }
    };
    
    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة العملاء</h2>
                <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                    إضافة عميل
                </button>
            </div>
             {customers.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                        <thead><tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الاسم</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الهاتف</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">البريد الإلكتروني</th>
                            {(canEdit || canDelete) && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>}
                        </tr></thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{customer.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{customer.phone}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{customer.email}</td>
                                    {(canEdit || canDelete) && (
                                        <td className="p-4">
                                            {canEdit && <button onClick={() => handleOpenModal(customer)} className="text-primary-600 hover:underline font-semibold">تعديل</button>}
                                            {canDelete && <button onClick={() => handleDelete(customer)} className="text-rose-600 hover:underline mr-4 font-semibold">حذف</button>}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState Icon={CustomersEmptyIcon} title="لا يوجد عملاء" message="ابدأ بإضافة بيانات العملاء لتتمكن من ربطهم بالوحدات." actionButton={{ text: 'إضافة عميل', onClick: () => handleOpenModal(null)}} />
            )}
            {isModalOpen && <CustomerPanel customer={editingCustomer} onClose={handleCloseModal} onSave={handleSave} />}
            <ConfirmModal isOpen={!!customerToDelete} onClose={() => setCustomerToDelete(null)} onConfirm={confirmDelete} title="تأكيد الحذف" message={`هل أنت متأكد من حذف العميل "${customerToDelete?.name}"؟`} />
        </div>
    );
};

interface PanelProps { customer: Customer | null; onClose: () => void; onSave: (data: Omit<Customer, 'id'>) => void; }

const CustomerPanel: React.FC<PanelProps> = ({ customer, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            addToast('الاسم ورقم الهاتف حقول إلزامية.', 'error');
            return;
        }
        onSave(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
         <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{customer ? 'تعديل عميل' : 'إضافة عميل جديد'}</h2><button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="name" placeholder="الاسم الكامل" value={formData.name} onChange={handleChange} className={inputStyle} required />
                        <div className="grid grid-cols-2 gap-4">
                           <input type="tel" name="phone" placeholder="رقم الهاتف" value={formData.phone} onChange={handleChange} className={inputStyle} required />
                           <input type="email" name="email" placeholder="البريد الإلكتروني" value={formData.email} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};


export default Customers;