import React, { useState, useEffect, useMemo } from 'react';
import { User, Project } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import logActivity from '../../utils/activityLogger';
import { usersService, projectsService } from '../../src/services/supabaseService';
import { CloseIcon, UserGroupIcon, SearchIcon, TrashIcon, EyeIcon, EditIcon } from '../shared/Icons';
import ConfirmModal from '../shared/ConfirmModal';

const RoleBadge: React.FC<{ role: User['role'] }> = ({ role }) => {
    const colors = {
        Admin: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
        Sales: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
        Accounting: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    };
    return <span className={`px-3 py-1 text-xs font-bold rounded-full ${colors[role]}`}>{role}</span>;
};

const PermissionBadge: React.FC<{ type: 'view' | 'edit' | 'delete' }> = ({ type }) => {
    const styles = {
        view: { text: 'عرض', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' },
        edit: { text: 'تعديل', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' },
        delete: { text: 'حذف', color: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300' },
    }
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${styles[type].color}`}>{styles[type].text}</span>;
};

// Interface for UserPanel props
interface PanelProps {
    user: User | null;
    projects: Project[];
    onClose: () => void;
    onSave: (userData: Omit<User, 'id'> & { assignedProjectId?: string }) => void;
}

const UserPanel: React.FC<PanelProps> = ({ user, projects, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        role: user?.role || 'Sales',
        password: '',
        confirmPassword: '',
        permissions: user?.permissions || { canView: true, canEdit: false, canDelete: false },
        assignedProjectId: projects.find(p => p.assignedUserId === user?.id)?.id || '',
    });

    const isEditing = !!user;

    const handlePermissionChange = (permission: 'canView' | 'canEdit' | 'canDelete') => {
        setFormData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [permission]: !prev.permissions[permission] }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('📋 Form submitted with data:', formData);
        
        if (!formData.name.trim() || !formData.role) {
            console.log('❌ Validation failed: name or role missing');
            addToast('الاسم والدور حقول إلزامية.', 'error');
            return;
        }
        if (!formData.username.trim()) {
            console.log('❌ Validation failed: username missing');
            addToast('اسم المستخدم مطلوب.', 'error');
            return;
        }
        // Username validation (allow Arabic, English letters, numbers, underscore)
        const usernameRegex = /^[\u0600-\u06FFa-zA-Z0-9_]+$/;
        if (!usernameRegex.test(formData.username)) {
            console.log('❌ Validation failed: invalid username format');
            addToast('اسم المستخدم يجب أن يحتوي على حروف أو أرقام أو _ فقط.', 'error');
            return;
        }
        if (!isEditing && !formData.password) {
            console.log('❌ Validation failed: password required for new user');
            addToast('كلمة المرور مطلوبة للمستخدمين الجدد.', 'error');
            return;
        }
        if (formData.password && formData.password !== formData.confirmPassword) {
            console.log('❌ Validation failed: passwords do not match');
            addToast('كلمتا المرور غير متطابقتين.', 'error');
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { confirmPassword, ...dataToSave } = formData;
        console.log('✅ All validations passed, calling onSave with:', dataToSave);
        onSave(dataToSave);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="glass-card w-full max-w-2xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-white/20 flex justify-between items-start">
                        <h2 className="text-xl font-bold text-white">{isEditing ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h2>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-300 hover:bg-white/10"><CloseIcon className="h-6 w-6"/></button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <input type="text" name="name" placeholder="الاسم الكامل" value={formData.name} onChange={handleChange} className="input-field" required />
                        <input type="text" name="username" placeholder="اسم المستخدم (للدخول)" value={formData.username} onChange={handleChange} className="input-field" required disabled={isEditing} />
                        <select name="role" value={formData.role} onChange={handleChange} className="input-field" required>
                            <option value="Sales">Sales - مبيعات</option>
                            <option value="Accounting">Accounting - محاسبة</option>
                            <option value="Admin">Admin - مدير</option>
                        </select>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200">كلمة المرور {isEditing && '(اتركها فارغة إذا لم ترد التغيير)'}</label>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="password" name="password" placeholder={isEditing ? 'كلمة مرور جديدة' : 'كلمة المرور'} value={formData.password} onChange={handleChange} className="input-field" />
                                <input type="password" name="confirmPassword" placeholder="تأكيد كلمة المرور" value={formData.confirmPassword} onChange={handleChange} className="input-field" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 hidden">
                        </div>
                        {(formData.role === 'Accounting' || formData.role === 'Sales') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-200">تعيين مشروع (اختياري)</label>
                                <select name="assignedProjectId" value={formData.assignedProjectId} onChange={handleChange} className="input-field">
                                    <option value="">بدون تعيين</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <p className="text-xs text-slate-400">يمكن تعيين مشروع رئيسي للمستخدم. يمكن إضافة مشاريع إضافية من صفحة "ربط المشاريع والمستخدمين"</p>
                            </div>
                        )}
                        {formData.role !== 'Admin' && (
                            <div className="pt-4 border-t border-white/20">
                                <h3 className="text-md font-semibold text-white mb-3">الصلاحيات الخاصة</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-200 hover:text-white transition-colors">
                                        <input type="checkbox" checked={formData.permissions.canView} onChange={() => handlePermissionChange('canView')} className="h-5 w-5 rounded border-white/30 bg-white/10 text-accent focus:ring-accent" />
                                        <div>
                                            <div>عرض البيانات</div>
                                            <div className="text-xs text-slate-400">يمكن المستخدم من عرض جميع البيانات</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-200 hover:text-white transition-colors">
                                        <input type="checkbox" checked={formData.permissions.canEdit} onChange={() => handlePermissionChange('canEdit')} className="h-5 w-5 rounded border-white/30 bg-white/10 text-accent focus:ring-accent" />
                                        <div>
                                            <div>تعديل البيانات</div>
                                            <div className="text-xs text-slate-400">يمكن المستخدم من تعديل وتحديث البيانات</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-200 hover:text-white transition-colors">
                                        <input type="checkbox" checked={formData.permissions.canDelete} onChange={() => handlePermissionChange('canDelete')} className="h-5 w-5 rounded border-white/30 bg-white/10 text-accent focus:ring-accent" />
                                        <div>
                                            <div>حذف البيانات</div>
                                            <div className="text-xs text-slate-400">يمكن المستخدم من حذف البيانات بشكل نهائي</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 border-t border-white/20 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 font-semibold transition-colors">إلغاء</button>
                        <button type="submit" className="btn-primary px-8 py-2">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Users: React.FC = () => {
    const { addToast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [roleFilter, setRoleFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersData, projectsData] = await Promise.all([
                    usersService.getAll(),
                    projectsService.getAll(),
                ]);
                setUsers(usersData);
                setProjects(projectsData);
            } catch (error) {
                addToast('Failed to fetch data.', 'error');
            }
        };
        fetchData();
    }, [addToast]);

    const saveUsers = (data: User[]) => {
        localStorage.setItem('users', JSON.stringify(data));
        setUsers(data);
    };

    const saveProjects = (data: Project[]) => {
        localStorage.setItem('projects', JSON.stringify(data));
        setProjects(data);
    };

    const handleSave = async (userData: Omit<User, 'id'> & { assignedProjectId?: string }) => {
        const isEditing = !!editingUser;
        console.log('💾 Saving user data:', userData);
        try {
            const { assignedProjectId, ...rest } = userData;
            
            // Only keep valid User properties
            const coreUserData: Omit<User, 'id'> = {
                name: rest.name,
                username: rest.username,
                email: rest.email,
                role: rest.role,
                password: rest.password,
                permissions: rest.permissions
            };
            
            console.log('📝 Core user data:', coreUserData);
            let userToSave: User;

            if (isEditing) {
                console.log('✏️ Editing existing user');
                // Admin can change password even during edit
                const updateData = { ...coreUserData };
                if (!updateData.password) {
                    delete updateData.password; // Don't send empty password
                }
                userToSave = await usersService.update(editingUser.id, updateData);
            } else {
                console.log('➕ Creating new user');
                if (!coreUserData.password) {
                    addToast('كلمة المرور مطلوبة للمستخدمين الجدد.', 'error');
                    return;
                }
                userToSave = await usersService.create(coreUserData);
                console.log('✅ User created:', userToSave);
            }

            // Handle project assignment
            if (userToSave.role === 'Accounting' && assignedProjectId) {
                await projectsService.update(assignedProjectId, { assignedUserId: userToSave.id });
            } else if (isEditing && editingUser.role === 'Accounting' && editingUser.assignedProjectId && editingUser.assignedProjectId !== assignedProjectId) {
                // Unassign from old project if changed
                await projectsService.update(editingUser.assignedProjectId, { assignedUserId: undefined });
            }

            const updatedUsers = await usersService.getAll();
            setUsers(updatedUsers);

            addToast(isEditing ? 'تم تحديث المستخدم بنجاح.' : 'تمت إضافة المستخدم بنجاح.', 'success');
            logActivity(isEditing ? 'Update User' : 'Add User', `User: ${userToSave.name}`);
            setIsModalOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            console.error('Error saving user:', error);
            const errorMessage = error.message || 'فشل حفظ المستخدم.';
            addToast(errorMessage, 'error');
        }
    };

    const handleDeleteRequest = (user: User) => {
        setUserToDelete(user);
    };

    const confirmDelete = () => {
        if (userToDelete) {
            const updatedUsers = users.filter(u => u.id !== userToDelete.id);
            saveUsers(updatedUsers);

            let currentProjects: Project[] = JSON.parse(localStorage.getItem('projects') || '[]');
            currentProjects = currentProjects.map(p => p.assignedUserId === userToDelete.id ? { ...p, assignedUserId: undefined } : p);
            saveProjects(currentProjects);

            addToast('تم حذف المستخدم بنجاح.', 'success');
            logActivity('Delete User', `Deleted user: ${userToDelete.name}`);
            setUserToDelete(null);
        }
    };
    
    const filteredUsers = useMemo(() => {
        return users
            .filter(user => roleFilter === 'All' || user.role === roleFilter)
            .filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, roleFilter, searchTerm]);

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة المستخدمين</h2>
                <button
                    onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm"
                >
                    إضافة مستخدم
                </button>
            </div>

            <div className="glass-card p-4 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 p-1 bg-white/10 rounded-full">
                        {(['All', 'Admin', 'Sales', 'Accounting'] as const).map(role => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-colors ${roleFilter === role ? 'mode-active' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                            >
                                {role === 'All' ? 'الكل' : role === 'Admin' ? 'مدير' : role === 'Sales' ? 'مبيعات' : 'محاسبة'}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-auto">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="بحث بالاسم..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field w-full md:w-64 pr-10 pl-4"
                        />
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[700px]">
                    <thead>
                        <tr className="border-b-2 border-white/20 bg-white/5">
                            <th className="p-4 font-bold text-sm text-slate-200">الاسم</th>
                            <th className="p-4 font-bold text-sm text-slate-200">اسم المستخدم</th>
                            <th className="p-4 font-bold text-sm text-slate-200">الدور</th>
                            <th className="p-4 font-bold text-sm text-slate-200">المشروع الرئيسي</th>
                            <th className="p-4 font-bold text-sm text-slate-200">الصلاحيات</th>
                            <th className="p-4 font-bold text-sm text-slate-200">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => {
                            const assignedProject = projects.find(p => p.assignedUserId === user.id);
                            return (
                                <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                                    <td className="p-4 font-medium text-slate-100">{user.name}</td>
                                    <td className="p-4 text-slate-300">{user.username}</td>
                                    <td className="p-4"><RoleBadge role={user.role} /></td>
                                    <td className="p-4 text-slate-300">{assignedProject?.name || <span className="text-slate-500">—</span>}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {user.role === 'Admin' ? (
                                                <span className="text-sm font-semibold text-emerald-400">كل الصلاحيات</span>
                                            ) : (
                                                <>
                                                    {user.permissions?.canView && <PermissionBadge type="view" />}
                                                    {user.permissions?.canEdit && <PermissionBadge type="edit" />}
                                                    {user.permissions?.canDelete && <PermissionBadge type="delete" />}
                                                    {!user.permissions?.canView && !user.permissions?.canEdit && !user.permissions?.canDelete && (
                                                        <span className="text-sm text-slate-500">بدون صلاحيات</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="text-blue-300 hover:text-blue-200 font-semibold transition-colors">
                                                <EditIcon className="h-5 w-5" />
                                            </button>
                                            {user.role !== 'Admin' && (
                                                <button onClick={() => handleDeleteRequest(user)} className="text-rose-400 hover:text-rose-300 font-semibold transition-colors">
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
                 {filteredUsers.length === 0 && (
                     <div className="text-center p-12 text-slate-300">
                        <UserGroupIcon className="h-12 w-12 mx-auto text-slate-400" />
                        <p className="mt-4 font-semibold">لا يوجد مستخدمون يطابقون البحث.</p>
                    </div>
                )}
            </div>
             {isModalOpen && <UserPanel user={editingUser} projects={projects} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
             <ConfirmModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={confirmDelete} title="تأكيد الحذف" message={`هل أنت متأكد من حذف المستخدم "${userToDelete?.name}"؟`} />
        </div>
    );
};

export default Users;
