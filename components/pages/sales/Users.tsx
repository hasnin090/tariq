import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { User, Project, UserResourcePermission, UserMenuAccess, UserButtonAccess, UserProjectAssignment } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useButtonPermissions } from '../../../hooks/useButtonPermission';
import logActivity from '../../../utils/activityLogger';
import { 
    usersService, 
    projectsService,
    userPermissionsService,
    userMenuAccessService,
    userButtonAccessService,
    userProjectAssignmentsService,
    userFullPermissionsService 
} from '../../../src/services/supabaseService';
import { 
    SYSTEM_RESOURCES, 
    SYSTEM_MENUS, 
    SYSTEM_BUTTONS,
    SALES_MENUS,
    ACCOUNTING_MENUS,
    SHARED_MENUS,
    ADMIN_MENUS,
    CUSTOMIZATION_MENUS,
    GENERAL_BUTTONS,
    SALES_BUTTONS,
    ACCOUNTING_BUTTONS
} from '../../../utils/permissions';
import { CloseIcon, UserGroupIcon, SearchIcon, TrashIcon, EditIcon, ShieldIcon } from '../../shared/Icons';
import ConfirmModal from '../../shared/ConfirmModal';
import SimplePermissionsManager from './SimplePermissionsManager';
import { validatePassword } from '../../../utils/validation';

const RoleBadge: React.FC<{ role: User['role'] }> = ({ role }) => {
    const colors = {
        Admin: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
        Sales: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
        Accounting: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    };
    return <span className={`px-3 py-1 text-xs font-bold rounded-full ${colors[role]}`}>{role}</span>;
};

// Interface for UserPanel props
interface PanelProps {
    user: User | null;
    projects: Project[];
    onClose: () => void;
    onSave: (userData: Omit<User, 'id'> & { assignedProjectId?: string }) => void;
    onOpenPermissions: (user: User) => void;
}

const UserPanel: React.FC<PanelProps> = ({ user, projects, onClose, onSave, onOpenPermissions }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        email: user?.email || '',
        role: user?.role || 'Sales',
        password: '',
        confirmPassword: '',
        assignedProjectId: projects.find(p => p.assignedUserId === user?.id)?.id || '',
    });
    const [savedUser, setSavedUser] = useState<User | null>(null);

    const isEditing = !!user;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.role) {
            addToast('الاسم والدور حقول إلزامية.', 'error');
            return;
        }
        if (!formData.username.trim()) {
            addToast('اسم المستخدم مطلوب.', 'error');
            return;
        }
        // Username validation (allow Arabic, English letters, numbers, underscore)
        const usernameRegex = /^[\u0600-\u06FFa-zA-Z0-9_]+$/;
        if (!usernameRegex.test(formData.username)) {
            addToast('اسم المستخدم يجب أن يحتوي على حروف أو أرقام أو _ فقط.', 'error');
            return;
        }
        if (!isEditing && !formData.password) {
            addToast('كلمة المرور مطلوبة للمستخدمين الجدد.', 'error');
            return;
        }
        if (formData.password && formData.password !== formData.confirmPassword) {
            addToast('كلمتا المرور غير متطابقتين.', 'error');
            return;
        }
        // ✅ التحقق من قوة كلمة المرور
        if (formData.password) {
            const passwordValidation = validatePassword(formData.password);
            if (!passwordValidation.valid) {
                addToast(passwordValidation.error || 'كلمة المرور غير صالحة', 'error');
                return;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { confirmPassword, ...dataToSave } = formData;
        onSave(dataToSave);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

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
                        <input type="email" name="email" placeholder="البريد الإلكتروني (اختياري)" value={formData.email} onChange={handleChange} className="input-field" />
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
                        {(formData.role === 'Accounting' || formData.role === 'Sales') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-200">تعيين مشروع (اختياري)</label>
                                <select name="assignedProjectId" value={formData.assignedProjectId} onChange={handleChange} className="input-field">
                                    <option value="">بدون تعيين</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <p className="text-xs text-slate-400">يمكن تعيين مشروع رئيسي للمستخدم</p>
                            </div>
                        )}
                        
                        {/* زر إدارة الصلاحيات */}
                        {isEditing && user && formData.role !== 'Admin' && (
                            <div className="pt-4 border-t border-white/20">
                                <button 
                                    type="button"
                                    onClick={() => onOpenPermissions(user)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-600 to-accent text-white font-semibold rounded-lg hover:from-primary-700 hover:to-accent/90 transition-all"
                                >
                                    <ShieldIcon className="h-5 w-5" />
                                    إدارة الصلاحيات المتقدمة
                                </button>
                                <p className="text-xs text-slate-400 text-center mt-2">تحكم بالقوائم والأزرار والموارد المتاحة لهذا المستخدم</p>
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

// ============================================================================
// مكون إدارة الصلاحيات لمستخدم معين
// ============================================================================
interface PermissionsEditorProps {
    user: User;
    projects: Project[];
    onClose: () => void;
    onSave: () => void;
}

const PermissionsEditor: React.FC<PermissionsEditorProps> = ({ user, projects, onClose, onSave }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'menus' | 'resources' | 'buttons' | 'projects'>('menus');
    const [saving, setSaving] = useState(false);
    
    // Modal animation refs
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    
    // GSAP animation
    useLayoutEffect(() => {
        if (overlayRef.current && modalRef.current) {
            const tl = gsap.timeline();
            tl.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: "power2.out" }
            );
            tl.fromTo(modalRef.current,
                { opacity: 0, scale: 0.85, y: 30 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.5)" },
                0.05
            );
        }
    }, []);
    
    // حالة الصلاحيات
    const [menuAccess, setMenuAccess] = useState<{ menuKey: string; isVisible: boolean }[]>([]);
    const [resourcePermissions, setResourcePermissions] = useState<{ 
        resource: string; 
        canView: boolean; 
        canCreate: boolean; 
        canEdit: boolean; 
        canDelete: boolean;
    }[]>([]);
    const [buttonAccess, setButtonAccess] = useState<{ pageKey: string; buttonKey: string; isVisible: boolean }[]>([]);
    const [projectAssignments, setProjectAssignments] = useState<{ projectId: string; interfaceMode: 'projects' | 'expenses' }[]>([]);

    // تحميل الصلاحيات الحالية
    useEffect(() => {
        const loadPermissions = async () => {
            try {
                const fullPerms = await userFullPermissionsService.getByUserId(user.id);
                
                
                // تحميل القوائم
                if (fullPerms.menuAccess && fullPerms.menuAccess.length > 0) {
                    setMenuAccess(fullPerms.menuAccess.map(m => ({ menuKey: m.menuKey, isVisible: m.isVisible })));
                } else {
                    const defaultMenus = SYSTEM_MENUS.map(m => ({
                        menuKey: m.key,
                        isVisible: user.role === 'Admin' || 
                            (user.role === 'Sales' && (m.interface === 'projects' || m.interface === 'both')) ||
                            (user.role === 'Accounting' && (m.interface === 'expenses' || m.interface === 'both'))
                    }));
                    setMenuAccess(defaultMenus);
                }

                // تحميل صلاحيات الموارد
                if (fullPerms.resourcePermissions && fullPerms.resourcePermissions.length > 0) {
                    setResourcePermissions(fullPerms.resourcePermissions.map(p => ({
                        resource: p.resource,
                        canView: p.canView,
                        canCreate: p.canCreate,
                        canEdit: p.canEdit,
                        canDelete: p.canDelete,
                    })));
                } else {
                    const defaultPerms = SYSTEM_RESOURCES.map(r => ({
                        resource: r.key,
                        canView: true,
                        canCreate: user.role === 'Admin',
                        canEdit: user.role === 'Admin',
                        canDelete: user.role === 'Admin',
                    }));
                    setResourcePermissions(defaultPerms);
                }

                // تحميل صلاحيات الأزرار
                if (fullPerms.buttonAccess && fullPerms.buttonAccess.length > 0) {
                    setButtonAccess(fullPerms.buttonAccess.map(b => ({
                        pageKey: b.pageKey,
                        buttonKey: b.buttonKey,
                        isVisible: b.isVisible,
                    })));
                } else {
                    const defaultButtons = SYSTEM_BUTTONS.map(b => ({
                        pageKey: b.page,
                        buttonKey: b.key,
                        isVisible: user.role === 'Admin',
                    }));
                    setButtonAccess(defaultButtons);
                }

                // تحميل المشاريع المعينة
                if (fullPerms.projectAssignments && fullPerms.projectAssignments.length > 0) {
                    setProjectAssignments(fullPerms.projectAssignments.map(a => ({
                        projectId: a.projectId,
                        interfaceMode: a.interfaceMode,
                    })));
                }
            } catch (error) {
                console.error('Error loading permissions:', error);
            }
        };

        loadPermissions();
    }, [user.id, user.role]);

    // حفظ الصلاحيات
    const handleSave = async () => {
        setSaving(true);
        try {
            const isDeleteLike = (key: string) =>
                key === 'delete' ||
                key.startsWith('delete-') ||
                key.startsWith('delete_') ||
                key.endsWith('-delete') ||
                key.endsWith('_delete');

            // ✅ تنظيف/توحيد صلاحيات الأزرار قبل الحفظ لتجنب التكرار
            const deduped = new Map<string, { pageKey: string; buttonKey: string; isVisible: boolean }>();
            for (const b of buttonAccess) {
                deduped.set(`${b.pageKey}::${b.buttonKey}`, b);
            }
            let normalizedButtons = Array.from(deduped.values());

            const globalDelete = normalizedButtons.find(b => b.pageKey === '*' && b.buttonKey === 'delete');
            const globalDeleteDisabled = globalDelete?.isVisible === false;
            if (globalDeleteDisabled) {
                // عند تعطيل الحذف بشكل رئيسي: لا معنى لتخزين أي صلاحيات حذف فرعية
                normalizedButtons = normalizedButtons.filter(b => !(isDeleteLike(b.buttonKey) && !(b.pageKey === '*' && b.buttonKey === 'delete')));
            }

            await userMenuAccessService.setMenuAccess(user.id, menuAccess);
            await userPermissionsService.setPermissions(user.id, resourcePermissions);
            await userButtonAccessService.setButtonAccess(user.id, normalizedButtons);
            await userProjectAssignmentsService.deleteByUserId(user.id);
            for (const assignment of projectAssignments) {
                await userProjectAssignmentsService.assign(user.id, assignment.projectId, assignment.interfaceMode);
            }

            logActivity('Update User Permissions', `Updated permissions for: ${user.name}`, 'projects');
            addToast('تم حفظ الصلاحيات بنجاح. يجب على المستخدم إعادة تسجيل الدخول لتطبيق التغييرات.', 'success');
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving permissions:', error);
            addToast('خطأ في حفظ الصلاحيات', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleMenu = (menuKey: string) => {
        setMenuAccess(prev => prev.map(m => 
            m.menuKey === menuKey ? { ...m, isVisible: !m.isVisible } : m
        ));
    };

    const toggleResourcePermission = (resource: string, permission: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => {
        setResourcePermissions(prev => prev.map(r => 
            r.resource === resource ? { ...r, [permission]: !r[permission] } : r
        ));
    };

    const toggleButton = (pageKey: string, buttonKey: string) => {
        const isDeleteLike = (key: string) =>
            key === 'delete' ||
            key.startsWith('delete-') ||
            key.startsWith('delete_') ||
            key.endsWith('-delete') ||
            key.endsWith('_delete');

        setButtonAccess(prev => {
            const idx = prev.findIndex(b => b.pageKey === pageKey && b.buttonKey === buttonKey);
            const next = [...prev];

            if (idx !== -1) {
                next[idx] = { ...next[idx], isVisible: !next[idx].isVisible };
            } else {
                next.push({ pageKey, buttonKey, isVisible: true });
            }

            // ✅ صلاحية رئيسية: إذا تم تعطيل زر الحذف العام، عطّل كل أزرار الحذف
            if (pageKey === '*' && buttonKey === 'delete') {
                const globalDeleteEntry = next.find(b => b.pageKey === '*' && b.buttonKey === 'delete');
                const globalDeleteDisabled = globalDeleteEntry?.isVisible === false;
                if (globalDeleteDisabled) {
                    return next.map(b => (isDeleteLike(b.buttonKey) ? { ...b, isVisible: false } : b));
                }
            }

            return next;
        });
    };

    const toggleProject = (projectId: string, interfaceMode: 'projects' | 'expenses') => {
        const exists = projectAssignments.find(a => a.projectId === projectId && a.interfaceMode === interfaceMode);
        if (exists) {
            setProjectAssignments(prev => prev.filter(a => !(a.projectId === projectId && a.interfaceMode === interfaceMode)));
        } else {
            setProjectAssignments(prev => [...prev, { projectId, interfaceMode }]);
        }
    };

    const selectAllMenus = (visible: boolean) => {
        setMenuAccess(prev => prev.map(m => ({ ...m, isVisible: visible })));
    };

    const selectAllResources = (permission: 'canView' | 'canCreate' | 'canEdit' | 'canDelete', value: boolean) => {
        setResourcePermissions(prev => prev.map(r => ({ ...r, [permission]: value })));
    };

    const tabButtonClass = (tab: string) => 
        `px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === tab 
                ? 'bg-primary-600 text-white' 
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
        }`;

    return (
        <div ref={overlayRef} className="fixed inset-0 z-[60] bg-slate-900/75 backdrop-blur-md flex items-start justify-center pt-20 pb-8 overflow-y-auto" onClick={onClose} style={{ perspective: '1000px' }}>
            <div ref={modalRef} className="w-full max-w-4xl mx-4 backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 rounded-3xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-white/20 flex justify-between items-center bg-gradient-to-br from-white/10 to-transparent">
                    <div>
                        <h2 className="text-xl font-bold text-white">إدارة صلاحيات المستخدم</h2>
                        <p className="text-slate-400 text-sm mt-1">{user.name} ({user.role})</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-rose-500/30 hover:text-rose-100 transition-all duration-300 shadow-lg backdrop-blur-sm border border-white/20 hover:border-rose-400/50">
                        <CloseIcon className="h-5 w-5"/>
                    </button>
                </div>

                {/* التبويبات */}
                <div className="p-4 border-b border-white/10 flex gap-2 flex-wrap">
                    <button onClick={() => setActiveTab('menus')} className={tabButtonClass('menus')}>
                        القوائم الظاهرة
                    </button>
                    <button onClick={() => setActiveTab('resources')} className={tabButtonClass('resources')}>
                        صلاحيات الموارد
                    </button>
                    <button onClick={() => setActiveTab('buttons')} className={tabButtonClass('buttons')}>
                        الأزرار
                    </button>
                    <button onClick={() => setActiveTab('projects')} className={tabButtonClass('projects')}>
                        المشاريع المعينة
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* تبويب القوائم */}
                    {activeTab === 'menus' && (
                        <div className="space-y-6">
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => selectAllMenus(true)} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                                    تحديد الكل
                                </button>
                                <button onClick={() => selectAllMenus(false)} className="px-3 py-1 text-xs bg-rose-600 text-white rounded-lg hover:bg-rose-700">
                                    إلغاء الكل
                                </button>
                            </div>

                            {/* قوائم واجهة المبيعات */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-sky-400 border-b border-sky-500/30 pb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                                    قوائم واجهة المبيعات
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {SALES_MENUS.map(menu => {
                                        const access = menuAccess.find(m => m.menuKey === menu.key);
                                        const isVisible = access?.isVisible ?? false;
                                        return (
                                            <label key={menu.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isVisible ? 'bg-sky-600/20 border border-sky-500/50' : 'bg-white/5 border border-white/10'}`}>
                                                <input type="checkbox" checked={isVisible} onChange={() => toggleMenu(menu.key)} className="h-4 w-4 rounded border-white/30 bg-white/10 text-sky-600 focus:ring-sky-500" />
                                                <div className="text-sm font-medium text-white">{menu.label}</div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* قوائم واجهة المحاسبة */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-amber-400 border-b border-amber-500/30 pb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                    قوائم واجهة المحاسبة
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {ACCOUNTING_MENUS.map(menu => {
                                        const access = menuAccess.find(m => m.menuKey === menu.key);
                                        const isVisible = access?.isVisible ?? false;
                                        return (
                                            <label key={menu.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isVisible ? 'bg-amber-600/20 border border-amber-500/50' : 'bg-white/5 border border-white/10'}`}>
                                                <input type="checkbox" checked={isVisible} onChange={() => toggleMenu(menu.key)} className="h-4 w-4 rounded border-white/30 bg-white/10 text-amber-600 focus:ring-amber-500" />
                                                <div className="text-sm font-medium text-white">{menu.label}</div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* قوائم مشتركة */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-emerald-400 border-b border-emerald-500/30 pb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                    قوائم مشتركة
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {SHARED_MENUS.map(menu => {
                                        const access = menuAccess.find(m => m.menuKey === menu.key);
                                        const isVisible = access?.isVisible ?? false;
                                        return (
                                            <label key={menu.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isVisible ? 'bg-emerald-600/20 border border-emerald-500/50' : 'bg-white/5 border border-white/10'}`}>
                                                <input type="checkbox" checked={isVisible} onChange={() => toggleMenu(menu.key)} className="h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-600 focus:ring-emerald-500" />
                                                <div className="text-sm font-medium text-white">{menu.label}</div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* قوائم الإدارة */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-purple-400 border-b border-purple-500/30 pb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                                    قوائم إدارة النظام
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {ADMIN_MENUS.map(menu => {
                                        const access = menuAccess.find(m => m.menuKey === menu.key);
                                        const isVisible = access?.isVisible ?? false;
                                        return (
                                            <label key={menu.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isVisible ? 'bg-purple-600/20 border border-purple-500/50' : 'bg-white/5 border border-white/10'}`}>
                                                <input type="checkbox" checked={isVisible} onChange={() => toggleMenu(menu.key)} className="h-4 w-4 rounded border-white/30 bg-white/10 text-purple-600 focus:ring-purple-500" />
                                                <div className="text-sm font-medium text-white">{menu.label}</div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* قوائم التخصيص */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-pink-400 border-b border-pink-500/30 pb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                                    قوائم التخصيص
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {CUSTOMIZATION_MENUS.map(menu => {
                                        const access = menuAccess.find(m => m.menuKey === menu.key);
                                        const isVisible = access?.isVisible ?? false;
                                        return (
                                            <label key={menu.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isVisible ? 'bg-pink-600/20 border border-pink-500/50' : 'bg-white/5 border border-white/10'}`}>
                                                <input type="checkbox" checked={isVisible} onChange={() => toggleMenu(menu.key)} className="h-4 w-4 rounded border-white/30 bg-white/10 text-pink-600 focus:ring-pink-500" />
                                                <div className="text-sm font-medium text-white">{menu.label}</div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* تبويب صلاحيات الموارد */}
                    {activeTab === 'resources' && (
                        <div className="space-y-4">
                            <div className="flex gap-2 mb-4 flex-wrap">
                                <button onClick={() => selectAllResources('canView', true)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg">
                                    السماح بالعرض للكل
                                </button>
                                <button onClick={() => selectAllResources('canCreate', true)} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg">
                                    السماح بالإنشاء للكل
                                </button>
                                <button onClick={() => selectAllResources('canEdit', true)} className="px-3 py-1 text-xs bg-amber-600 text-white rounded-lg">
                                    السماح بالتعديل للكل
                                </button>
                                <button onClick={() => selectAllResources('canDelete', true)} className="px-3 py-1 text-xs bg-rose-600 text-white rounded-lg">
                                    السماح بالحذف للكل
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-right min-w-[500px]">
                                    <thead>
                                        <tr className="border-b border-white/20">
                                            <th className="p-3 text-sm font-bold text-slate-200">المورد</th>
                                            <th className="p-3 text-sm font-bold text-slate-200 text-center">عرض</th>
                                            <th className="p-3 text-sm font-bold text-slate-200 text-center">إنشاء</th>
                                            <th className="p-3 text-sm font-bold text-slate-200 text-center">تعديل</th>
                                            <th className="p-3 text-sm font-bold text-slate-200 text-center">حذف</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SYSTEM_RESOURCES.map(resource => {
                                            const perm = resourcePermissions.find(p => p.resource === resource.key);
                                            return (
                                                <tr key={resource.key} className="border-b border-white/10 hover:bg-white/5">
                                                    <td className="p-3">
                                                        <div className="text-sm font-medium text-white">{resource.label}</div>
                                                        <div className="text-xs text-slate-400">
                                                            {resource.interface === 'projects' ? 'مبيعات' : resource.interface === 'expenses' ? 'محاسبة' : 'عام'}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={perm?.canView ?? false}
                                                            onChange={() => toggleResourcePermission(resource.key, 'canView')}
                                                            className="h-5 w-5 rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={perm?.canCreate ?? false}
                                                            onChange={() => toggleResourcePermission(resource.key, 'canCreate')}
                                                            className="h-5 w-5 rounded border-white/30 bg-white/10 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={perm?.canEdit ?? false}
                                                            onChange={() => toggleResourcePermission(resource.key, 'canEdit')}
                                                            className="h-5 w-5 rounded border-white/30 bg-white/10 text-amber-600 focus:ring-amber-500"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={perm?.canDelete ?? false}
                                                            onChange={() => toggleResourcePermission(resource.key, 'canDelete')}
                                                            className="h-5 w-5 rounded border-white/30 bg-white/10 text-rose-600 focus:ring-rose-500"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* تبويب الأزرار */}
                    {activeTab === 'buttons' && (
                        <div className="space-y-6">
                            <p className="text-slate-400 text-sm mb-4">
                                حدد الأزرار التي تريد أن تظهر للمستخدم في كل صفحة
                            </p>

                            {/* أزرار عامة */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-gray-400 border-b border-gray-500/30 pb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                                    أزرار عامة (جميع الصفحات)
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {GENERAL_BUTTONS.map(button => {
                                        const access = buttonAccess.find(b => b.pageKey === button.page && b.buttonKey === button.key);
                                        const isVisible = access?.isVisible ?? false;

                                        const globalDeleteAccess = buttonAccess.find(b => b.pageKey === '*' && b.buttonKey === 'delete');
                                        const globalDeleteDisabled = globalDeleteAccess ? globalDeleteAccess.isVisible === false : false;
                                        const isDeleteLike =
                                            button.key === 'delete' ||
                                            button.key.startsWith('delete-') ||
                                            button.key.startsWith('delete_') ||
                                            button.key.endsWith('-delete') ||
                                            button.key.endsWith('_delete');
                                        const isDisabled = globalDeleteDisabled && isDeleteLike && !(button.page === '*' && button.key === 'delete');

                                        return (
                                            <label
                                                key={`${button.page}-${button.key}`}
                                                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                                    isVisible
                                                        ? 'bg-gray-600/20 border border-gray-500/50'
                                                        : 'bg-white/5 border border-white/10'
                                                } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isVisible}
                                                    disabled={isDisabled}
                                                    onChange={() => !isDisabled && toggleButton(button.page, button.key)}
                                                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-gray-600 focus:ring-gray-500"
                                                />
                                                <div className="text-sm font-medium text-white">{button.label}</div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* أزرار واجهة المبيعات */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-sky-400 border-b border-sky-500/30 pb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                                    أزرار واجهة المبيعات
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {SALES_BUTTONS.map(button => {
                                        const access = buttonAccess.find(b => b.pageKey === button.page && b.buttonKey === button.key);
                                        const isVisible = access?.isVisible ?? false;

                                        const globalDeleteAccess = buttonAccess.find(b => b.pageKey === '*' && b.buttonKey === 'delete');
                                        const globalDeleteDisabled = globalDeleteAccess ? globalDeleteAccess.isVisible === false : false;
                                        const isDeleteLike =
                                            button.key === 'delete' ||
                                            button.key.startsWith('delete-') ||
                                            button.key.startsWith('delete_') ||
                                            button.key.endsWith('-delete') ||
                                            button.key.endsWith('_delete');
                                        const isDisabled = globalDeleteDisabled && isDeleteLike;

                                        return (
                                            <label
                                                key={`${button.page}-${button.key}`}
                                                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                                    isVisible
                                                        ? 'bg-sky-600/20 border border-sky-500/50'
                                                        : 'bg-white/5 border border-white/10'
                                                } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isVisible}
                                                    disabled={isDisabled}
                                                    onChange={() => !isDisabled && toggleButton(button.page, button.key)}
                                                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-sky-600 focus:ring-sky-500"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-white">{button.label}</div>
                                                    <div className="text-xs text-slate-400">{button.page}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* أزرار واجهة المحاسبة */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-amber-400 border-b border-amber-500/30 pb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                    أزرار واجهة المحاسبة
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {ACCOUNTING_BUTTONS.map(button => {
                                        const access = buttonAccess.find(b => b.pageKey === button.page && b.buttonKey === button.key);
                                        const isVisible = access?.isVisible ?? false;

                                        const globalDeleteAccess = buttonAccess.find(b => b.pageKey === '*' && b.buttonKey === 'delete');
                                        const globalDeleteDisabled = globalDeleteAccess ? globalDeleteAccess.isVisible === false : false;
                                        const isDeleteLike =
                                            button.key === 'delete' ||
                                            button.key.startsWith('delete-') ||
                                            button.key.startsWith('delete_') ||
                                            button.key.endsWith('-delete') ||
                                            button.key.endsWith('_delete');
                                        const isDisabled = globalDeleteDisabled && isDeleteLike;

                                        return (
                                            <label
                                                key={`${button.page}-${button.key}`}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                                    isVisible
                                                        ? 'bg-amber-600/20 border border-amber-500/50'
                                                        : 'bg-white/5 border border-white/10'
                                                } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isVisible}
                                                    disabled={isDisabled}
                                                    onChange={() => !isDisabled && toggleButton(button.page, button.key)}
                                                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-amber-600 focus:ring-amber-500"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-white">{button.label}</div>
                                                    <div className="text-xs text-slate-400">{button.page}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* تبويب المشاريع */}
                    {activeTab === 'projects' && (
                        <div className="space-y-4">
                            <p className="text-slate-400 text-sm mb-4">
                                حدد المشاريع التي يمكن للمستخدم الوصول إليها
                            </p>

                            {projects.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    لا توجد مشاريع متاحة
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {projects.map(project => {
                                        const salesAssignment = projectAssignments.find(a => a.projectId === project.id && a.interfaceMode === 'projects');
                                        const accountingAssignment = projectAssignments.find(a => a.projectId === project.id && a.interfaceMode === 'expenses');
                                        
                                        return (
                                            <div key={project.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-semibold text-white">{project.name}</h4>
                                                </div>
                                                <div className="flex gap-4 flex-wrap">
                                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                                                        salesAssignment ? 'bg-sky-600/30 border border-sky-500/50' : 'bg-white/5 border border-white/10'
                                                    }`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!salesAssignment}
                                                            onChange={() => toggleProject(project.id, 'projects')}
                                                            className="h-4 w-4 rounded"
                                                        />
                                                        <span className="text-sm text-white">واجهة المبيعات</span>
                                                    </label>
                                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                                                        accountingAssignment ? 'bg-amber-600/30 border border-amber-500/50' : 'bg-white/5 border border-white/10'
                                                    }`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!accountingAssignment}
                                                            onChange={() => toggleProject(project.id, 'expenses')}
                                                            className="h-4 w-4 rounded"
                                                        />
                                                        <span className="text-sm text-white">واجهة المحاسبة</span>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* أزرار الحفظ */}
                <div className="px-6 py-4 border-t border-white/20 flex justify-end gap-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 font-semibold transition-colors"
                    >
                        إلغاء
                    </button>
                    <button 
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary px-8 py-2 disabled:opacity-50"
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const Users: React.FC = () => {
    const { addToast } = useToast();
    
    // ✅ نظام الصلاحيات
    const { canShow } = useButtonPermissions();
    const canAdd = canShow('users', 'add');
    const canEdit = canShow('users', 'edit');
    const canDelete = canShow('users', 'delete');
    
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
    const [roleFilter, setRoleFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);

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
            
            let userToSave: User;

            if (isEditing) {
                // Admin can change password even during edit
                const updateData = { ...coreUserData };
                if (!updateData.password) {
                    delete updateData.password; // Don't send empty password
                }
                userToSave = await usersService.update(editingUser.id, updateData);
            } else {
                if (!coreUserData.password) {
                    addToast('كلمة المرور مطلوبة للمستخدمين الجدد.', 'error');
                    return;
                }
                userToSave = await usersService.create(coreUserData);
            }

            // Handle project assignment (with error handling for missing column)
            try {
                if (assignedProjectId && (userToSave.role === 'Accounting' || userToSave.role === 'Sales')) {
                    // تحديد الحقل المناسب حسب الدور
                    const updateField = userToSave.role === 'Sales' 
                        ? { salesUserId: userToSave.id }
                        : { accountingUserId: userToSave.id };
                    
                    await projectsService.update(assignedProjectId, updateField);
                }
                
                // إلغاء التعيين من المشروع القديم إذا تغير
                if (isEditing && editingUser.assignedProjectId && editingUser.assignedProjectId !== assignedProjectId) {
                    const unassignField = editingUser.role === 'Sales'
                        ? { salesUserId: null }
                        : { accountingUserId: null };
                    
                    await projectsService.update(editingUser.assignedProjectId, unassignField);
                }
            } catch (projectError: any) {
                console.warn('Could not update project assignment (column may not exist):', projectError);
                // لا نوقف حفظ المستخدم إذا فشل تعيين المشروع
            }

            const updatedUsers = await usersService.getAll();
            setUsers(updatedUsers);

            addToast(isEditing ? 'تم تحديث المستخدم بنجاح.' : 'تمت إضافة المستخدم بنجاح.', 'success');
            logActivity(isEditing ? 'Update User' : 'Add User', `User: ${userToSave.name}`, 'projects');
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

    const confirmDelete = async () => {
        if (userToDelete) {
            try {
                // حذف المستخدم من قاعدة البيانات
                await usersService.delete(userToDelete.id);
                
                // تحديث القائمة المحلية
                const updatedUsers = users.filter(u => u.id !== userToDelete.id);
                setUsers(updatedUsers);
                saveUsers(updatedUsers);

                // إلغاء تعيين المستخدم من المشاريع
                try {
                    const currentProjects = await projectsService.getAll();
                    for (const project of currentProjects) {
                        if (project.assignedUserId === userToDelete.id) {
                            // تحديث فقط حقل assignedUserId
                            await projectsService.update(project.id, { assignedUserId: null });
                        }
                    }
                } catch (projectError) {
                    console.error('Error updating projects:', projectError);
                    // لا نوقف العملية إذا فشل تحديث المشاريع
                }

                addToast('تم حذف المستخدم بنجاح من قاعدة البيانات.', 'success');
                logActivity('Delete User', `Deleted user: ${userToDelete.name}`, 'projects');
                setUserToDelete(null);
            } catch (error) {
                console.error('Error deleting user:', error);
                addToast('فشل حذف المستخدم. الرجاء المحاولة مرة أخرى.', 'error');
            }
        }
    };
    
    const filteredUsers = useMemo(() => {
        return users
            .filter(user => roleFilter === 'All' || user.role === roleFilter)
            .filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, roleFilter, searchTerm]);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && filteredUsers.length > 0 && !hasAnimated.current) {
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
    }, [filteredUsers]);

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة المستخدمين</h2>
                {canAdd && (
                    <button
                        onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                        className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm"
                    >
                        إضافة مستخدم
                    </button>
                )}
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
                    <tbody ref={tableBodyRef}>
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
                                                <button 
                                                    onClick={() => setPermissionsUser(user)}
                                                    className="px-3 py-1 text-xs bg-primary-600/30 text-primary-300 border border-primary-500/50 rounded-lg hover:bg-primary-600/50 transition-colors flex items-center gap-1"
                                                >
                                                    <ShieldIcon className="h-3 w-3" />
                                                    إدارة الصلاحيات
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {canEdit && (
                                                <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="text-blue-300 hover:text-blue-200 font-semibold transition-colors">
                                                    <EditIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                            {canDelete && user.role !== 'Admin' && (
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
             {isModalOpen && ((editingUser === null && canAdd) || (editingUser !== null && canEdit)) && (
                <UserPanel 
                    user={editingUser} 
                    projects={projects} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSave}
                    onOpenPermissions={(user) => {
                        setIsModalOpen(false);
                        setPermissionsUser(user);
                    }}
                />
             )}
             {permissionsUser && (
                <SimplePermissionsManager 
                    user={permissionsUser}
                    onClose={() => setPermissionsUser(null)}
                    onSave={async () => {
                        // تحديث قائمة المستخدمين بعد الحفظ
                        const updatedUsers = await usersService.getAll();
                        setUsers(updatedUsers);
                        addToast('تم حفظ الصلاحيات بنجاح', 'success');
                    }}
                />
             )}
             <ConfirmModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={confirmDelete} title="تأكيد الحذف" message={`هل أنت متأكد من حذف المستخدم "${userToDelete?.name}"؟`} />
        </div>
    );
};

export default Users;
