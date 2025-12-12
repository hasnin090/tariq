import React, { useState, useEffect } from 'react';
import { User, Project, UserResourcePermission, UserMenuAccess, UserButtonAccess, UserProjectAssignment } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
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
import { CloseIcon, SearchIcon, CheckIcon } from '../../shared/Icons';
import Modal from '../../shared/Modal';
import ConfirmModal from '../../shared/ConfirmModal';

interface UserWithPermissions extends User {
  fullPermissions?: {
    resourcePermissions: UserResourcePermission[];
    menuAccess: UserMenuAccess[];
    buttonAccess: UserButtonAccess[];
    projectAssignments: UserProjectAssignment[];
  };
}

// ============================================================================
// مكون إدارة الصلاحيات لمستخدم معين
// ============================================================================
interface PermissionsEditorProps {
  user: UserWithPermissions;
  projects: Project[];
  onClose: () => void;
  onSave: () => void;
}

const PermissionsEditor: React.FC<PermissionsEditorProps> = ({ user, projects, onClose, onSave }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'menus' | 'resources' | 'buttons' | 'projects'>('menus');
  const [saving, setSaving] = useState(false);
  
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
        if (fullPerms.menuAccess.length > 0) {
          setMenuAccess(fullPerms.menuAccess.map(m => ({ menuKey: m.menuKey, isVisible: m.isVisible })));
        } else {
          // إعداد افتراضي - كل القوائم ظاهرة حسب الدور
          const defaultMenus = SYSTEM_MENUS.map(m => ({
            menuKey: m.key,
            isVisible: user.role === 'Admin' || 
              (user.role === 'Sales' && (m.interface === 'projects' || m.interface === 'both')) ||
              (user.role === 'Accounting' && (m.interface === 'expenses' || m.interface === 'both'))
          }));
          setMenuAccess(defaultMenus);
        }

        // تحميل صلاحيات الموارد
        if (fullPerms.resourcePermissions.length > 0) {
          setResourcePermissions(fullPerms.resourcePermissions.map(p => ({
            resource: p.resource,
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
          })));
        } else {
          // إعداد افتراضي
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
        if (fullPerms.buttonAccess.length > 0) {
          setButtonAccess(fullPerms.buttonAccess.map(b => ({
            pageKey: b.pageKey,
            buttonKey: b.buttonKey,
            isVisible: b.isVisible,
          })));
        } else {
          // إعداد افتراضي - كل الأزرار ظاهرة للمدير
          const defaultButtons = SYSTEM_BUTTONS.map(b => ({
            pageKey: b.page,
            buttonKey: b.key,
            isVisible: user.role === 'Admin',
          }));
          setButtonAccess(defaultButtons);
        }

        // تحميل المشاريع المعينة
        if (fullPerms.projectAssignments.length > 0) {
          setProjectAssignments(fullPerms.projectAssignments.map(a => ({
            projectId: a.projectId,
            interfaceMode: a.interfaceMode,
          })));
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
        addToast('خطأ في تحميل الصلاحيات', 'error');
      }
    };

    loadPermissions();
  }, [user.id, user.role, addToast]);

  // حفظ الصلاحيات
  const handleSave = async () => {
    setSaving(true);
    try {
      // حفظ القوائم
      await userMenuAccessService.setMenuAccess(user.id, menuAccess);

      // حفظ صلاحيات الموارد
      await userPermissionsService.setPermissions(user.id, resourcePermissions);

      // حفظ صلاحيات الأزرار
      await userButtonAccessService.setButtonAccess(user.id, buttonAccess);

      // حفظ المشاريع المعينة
      await userProjectAssignmentsService.deleteByUserId(user.id);
      for (const assignment of projectAssignments) {
        await userProjectAssignmentsService.assign(user.id, assignment.projectId, assignment.interfaceMode);
      }

      logActivity('Update User Permissions', `Updated permissions for: ${user.name}`);
      addToast('تم حفظ الصلاحيات بنجاح', 'success');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      addToast('خطأ في حفظ الصلاحيات', 'error');
    } finally {
      setSaving(false);
    }
  };

  // تبديل حالة قائمة
  const toggleMenu = (menuKey: string) => {
    setMenuAccess(prev => prev.map(m => 
      m.menuKey === menuKey ? { ...m, isVisible: !m.isVisible } : m
    ));
  };

  // تبديل حالة صلاحية مورد
  const toggleResourcePermission = (resource: string, permission: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => {
    setResourcePermissions(prev => prev.map(r => 
      r.resource === resource ? { ...r, [permission]: !r[permission] } : r
    ));
  };

  // تبديل حالة زر
  const toggleButton = (pageKey: string, buttonKey: string) => {
    const exists = buttonAccess.find(b => b.pageKey === pageKey && b.buttonKey === buttonKey);
    if (exists) {
      setButtonAccess(prev => prev.map(b => 
        b.pageKey === pageKey && b.buttonKey === buttonKey ? { ...b, isVisible: !b.isVisible } : b
      ));
    } else {
      setButtonAccess(prev => [...prev, { pageKey, buttonKey, isVisible: true }]);
    }
  };

  // تبديل تعيين مشروع
  const toggleProject = (projectId: string, interfaceMode: 'projects' | 'expenses') => {
    const exists = projectAssignments.find(a => a.projectId === projectId && a.interfaceMode === interfaceMode);
    if (exists) {
      setProjectAssignments(prev => prev.filter(a => !(a.projectId === projectId && a.interfaceMode === interfaceMode)));
    } else {
      setProjectAssignments(prev => [...prev, { projectId, interfaceMode }]);
    }
  };

  // تحديد/إلغاء تحديد الكل
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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-start p-4 pt-10 overflow-y-auto" onClick={onClose}>
      <div className="glass-card w-full max-w-4xl my-4" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/20 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">إدارة صلاحيات المستخدم</h2>
            <p className="text-slate-400 text-sm mt-1">{user.name} ({user.role})</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-300 hover:bg-white/10">
            <CloseIcon className="h-6 w-6"/>
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
                    return (
                      <label key={`${button.page}-${button.key}`} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isVisible ? 'bg-gray-600/20 border border-gray-500/50' : 'bg-white/5 border border-white/10'}`}>
                        <input type="checkbox" checked={isVisible} onChange={() => toggleButton(button.page, button.key)} className="h-4 w-4 rounded border-white/30 bg-white/10 text-gray-600 focus:ring-gray-500" />
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
                    return (
                      <label key={`${button.page}-${button.key}`} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isVisible ? 'bg-sky-600/20 border border-sky-500/50' : 'bg-white/5 border border-white/10'}`}>
                        <input type="checkbox" checked={isVisible} onChange={() => toggleButton(button.page, button.key)} className="h-4 w-4 rounded border-white/30 bg-white/10 text-sky-600 focus:ring-sky-500" />
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
                    return (
                      <label key={`${button.page}-${button.key}`} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isVisible ? 'bg-amber-600/20 border border-amber-500/50' : 'bg-white/5 border border-white/10'}`}>
                        <input type="checkbox" checked={isVisible} onChange={() => toggleButton(button.page, button.key)} className="h-4 w-4 rounded border-white/30 bg-white/10 text-amber-600 focus:ring-amber-500" />
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
                حدد المشاريع التي يمكن للمستخدم الوصول إليها ونوع الواجهة لكل مشروع
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

        <div className="p-4 border-t border-white/20 flex justify-end gap-4">
          <button 
            onClick={onClose} 
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 font-semibold transition-colors"
          >
            إلغاء
          </button>
          <button 
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

// ============================================================================
// الصفحة الرئيسية لإدارة صلاحيات المستخدمين
// ============================================================================
const UserPermissionsManager: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, projectsData] = await Promise.all([
        usersService.getAll(),
        projectsService.getAll()
      ]);
      // فلترة المستخدمين (بدون Admin لأن له كل الصلاحيات)
      setUsers(usersData.filter((u: User) => u.role !== 'Admin'));
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
      addToast('خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  // التأكد من أن المستخدم الحالي هو Admin
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="container mx-auto">
        <div className="bg-rose-100 dark:bg-rose-900/20 border border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-lg">
          هذه الصفحة متاحة للمدراء فقط
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">إدارة الصلاحيات المتقدمة</h2>
        <p className="text-slate-600 dark:text-slate-400">
          قم بتخصيص القوائم والأزرار والصلاحيات لكل مستخدم
        </p>
      </div>

      {/* شريط البحث */}
      <div className="glass-card p-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <SearchIcon className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="بحث بالاسم أو اسم المستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full md:w-96 pr-10 pl-4"
          />
        </div>
      </div>

      {/* قائمة المستخدمين */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-white/20 bg-white/5">
                <th className="p-4 font-bold text-sm text-slate-200">المستخدم</th>
                <th className="p-4 font-bold text-sm text-slate-200">الدور</th>
                <th className="p-4 font-bold text-sm text-slate-200">القوائم المتاحة</th>
                <th className="p-4 font-bold text-sm text-slate-200">المشاريع المعينة</th>
                <th className="p-4 font-bold text-sm text-slate-200">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-100">{user.name}</div>
                    <div className="text-sm text-slate-400">{user.username}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      user.role === 'Sales' 
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                    }`}>
                      {user.role === 'Sales' ? 'مبيعات' : 'محاسبة'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-300">
                    <span className="text-sm">انقر لعرض التفاصيل</span>
                  </td>
                  <td className="p-4 text-slate-300">
                    <span className="text-sm">انقر لعرض التفاصيل</span>
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      إدارة الصلاحيات
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    لا يوجد مستخدمون يطابقون البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة إدارة الصلاحيات */}
      {selectedUser && (
        <PermissionsEditor 
          user={selectedUser}
          projects={projects}
          onClose={() => setSelectedUser(null)}
          onSave={loadData}
        />
      )}
    </div>
  );
};

export default UserPermissionsManager;
