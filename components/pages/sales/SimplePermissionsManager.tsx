import React, { useMemo, useState, useEffect } from 'react';
import { InterfaceMode, User } from '../../../types';
import { 
  PERMISSION_PRESETS, 
  PermissionTemplate, 
  applyPermissionPreset,
  detectCurrentPreset,
  SYSTEM_MENUS 
} from '../../../utils/permissions';
import { 
  userFullPermissionsService,
  userMenuAccessService,
  userPermissionsService,
  userButtonAccessService
} from '../../../src/services/supabaseService';
import { CheckIcon, CloseIcon } from '../../shared/Icons';

interface SimplePermissionsManagerProps {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

/**
 * مكون مبسط لإدارة صلاحيات المستخدم
 * يستخدم قوالب جاهزة لتسهيل الإدارة
 */
export const SimplePermissionsManager: React.FC<SimplePermissionsManagerProps> = ({ user, onClose, onSave }) => {
  const [selectedPreset, setSelectedPreset] = useState<PermissionTemplate>('full');
  const [customMenus, setCustomMenus] = useState<string[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [detectedInterfaceMode, setDetectedInterfaceMode] = useState<InterfaceMode | 'both'>(() => {
    if (user.role === 'Sales') return 'projects';
    if (user.role === 'Accounting') return 'expenses';
    return 'both';
  });
  const [interfaceFilter, setInterfaceFilter] = useState<InterfaceMode | 'both'>(() => {
    if (user.role === 'Sales') return 'projects';
    if (user.role === 'Accounting') return 'expenses';
    return 'both';
  });
  
  // صلاحيات الأزرار
  const [buttonPermissions, setButtonPermissions] = useState({
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    canPrint: true,
  });
  
  // قوالب الصلاحيات المتاحة لهذا الدور
  const availablePresets = PERMISSION_PRESETS[user.role] || [];
  
  // القوائم المتاحة للاختيار المخصص
  const availableMenus = useMemo(() => {
    return SYSTEM_MENUS.filter((menu) => {
      if (interfaceFilter === 'projects') {
        return menu.interface === 'projects' || menu.interface === 'both';
      }
      if (interfaceFilter === 'expenses') {
        return menu.interface === 'expenses' || menu.interface === 'both';
      }
      return true; // both
    });
  }, [interfaceFilter]);

  const allowedCustomMenus = useMemo(() => {
    const allowedKeys = new Set(availableMenus.map((m) => m.key));
    return customMenus.filter((key) => allowedKeys.has(key));
  }, [availableMenus, customMenus]);

  const interfaceLabel = useMemo(() => {
    if (detectedInterfaceMode === 'projects') return 'واجهة المبيعات';
    if (detectedInterfaceMode === 'expenses') return 'واجهة الحسابات';
    return 'واجهتين (مبيعات + حسابات)';
  }, [detectedInterfaceMode]);

  const canSwitchInterfaceFilter = useMemo(() => {
    // إذا كان المستخدم مرتبط بواجهتين أو المدير يريد رؤية الكل، نسمح بالتبديل
    return detectedInterfaceMode === 'both' || user.role === 'Admin';
  }, [detectedInterfaceMode, user.role]);

  // تحميل الصلاحيات الحالية
  useEffect(() => {
    const loadCurrentPermissions = async () => {
      try {
        const fullPerms = await userFullPermissionsService.getByUserId(user.id);

        // اكتشاف واجهة المستخدم من ربط المشاريع (الأدق من الدور)
        const modes = new Set<InterfaceMode>();
        for (const assignment of fullPerms.projectAssignments || []) {
          if (assignment?.interfaceMode === 'projects' || assignment?.interfaceMode === 'expenses') {
            modes.add(assignment.interfaceMode);
          }
        }
        let detected: InterfaceMode | 'both';
        if (modes.size === 1) {
          detected = Array.from(modes)[0];
        } else if (modes.size > 1) {
          detected = 'both';
        } else {
          // fallback منطقي حسب الدور
          if (user.role === 'Sales') detected = 'projects';
          else if (user.role === 'Accounting') detected = 'expenses';
          else detected = 'both';
        }
        setDetectedInterfaceMode(detected);
        setInterfaceFilter((prev) => (prev === 'both' && detected !== 'both' ? detected : detected));
        
        if (fullPerms.menuAccess.length > 0) {
          // كشف القالب الحالي
          const currentPreset = detectCurrentPreset(user.role, fullPerms.menuAccess);
          setSelectedPreset(currentPreset);
          
          if (currentPreset === 'custom') {
            setIsCustomMode(true);
            const allowedKeys = new Set(
              SYSTEM_MENUS.filter((menu) => {
                if (detected === 'projects') return menu.interface === 'projects' || menu.interface === 'both';
                if (detected === 'expenses') return menu.interface === 'expenses' || menu.interface === 'both';
                return true;
              }).map((m) => m.key)
            );
            const visibleMenus = fullPerms.menuAccess
              .filter((m) => m.isVisible)
              .map((m) => m.menuKey)
              .filter((key) => allowedKeys.has(key));
            setCustomMenus(visibleMenus);
          }
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    };
    
    loadCurrentPermissions();
  }, [user.id, user.role]);

  // حفظ الصلاحيات
  const handleSave = async () => {
    setIsSaving(true);
    try {
      let menuAccess: { menuKey: string; isVisible: boolean }[];
      let resourcePermissions: { 
        resource: string; 
        canView: boolean; 
        canCreate: boolean; 
        canEdit: boolean; 
        canDelete: boolean 
      }[] = [];
      let buttonAccess: { 
        pageKey: string; 
        buttonKey: string; 
        isVisible: boolean 
      }[] = [];
      
      if (selectedPreset === 'custom' && isCustomMode) {
        // استخدام القوائم المخصصة
        const allowedKeys = new Set(availableMenus.map((m) => m.key));
        const sanitizedMenus = customMenus.filter((key) => allowedKeys.has(key));
        menuAccess = sanitizedMenus.map((menuKey) => ({
          menuKey,
          isVisible: true,
        }));
        // استخدام صلاحيات الأزرار المخصصة
        buttonAccess = [
          { pageKey: '*', buttonKey: 'add', isVisible: buttonPermissions.canAdd },
          { pageKey: '*', buttonKey: 'edit', isVisible: buttonPermissions.canEdit },
          { pageKey: '*', buttonKey: 'delete', isVisible: buttonPermissions.canDelete },
          { pageKey: '*', buttonKey: 'export', isVisible: buttonPermissions.canExport },
          { pageKey: '*', buttonKey: 'print', isVisible: buttonPermissions.canPrint },
        ];
      } else {
        // استخدام القالب المحدد
        const preset = applyPermissionPreset(user.role, selectedPreset);
        menuAccess = preset.menuAccess.map(m => ({
          menuKey: m.menuKey,
          isVisible: m.isVisible
        }));
        resourcePermissions = preset.resourcePermissions.map(r => ({
          resource: r.resource,
          canView: r.canView,
          canCreate: r.canCreate,
          canEdit: r.canEdit,
          canDelete: r.canDelete
        }));
        buttonAccess = preset.buttonAccess.map(b => ({
          pageKey: b.pageKey,
          buttonKey: b.buttonKey,
          isVisible: b.isVisible
        }));
      }
      
      // حذف الصلاحيات القديمة
      await userMenuAccessService.deleteByUserId(user.id);
      await userPermissionsService.deleteByUserId(user.id);
      await userButtonAccessService.deleteByUserId(user.id);
      
      // حفظ الصلاحيات الجديدة
      if (menuAccess.length > 0) {
        await userMenuAccessService.setMenuAccess(user.id, menuAccess);
      }
      
      if (resourcePermissions.length > 0) {
        await userPermissionsService.setPermissions(user.id, resourcePermissions);
      }
      
      if (buttonAccess.length > 0) {
        await userButtonAccessService.setButtonAccess(user.id, buttonAccess);
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('حدث خطأ أثناء حفظ الصلاحيات');
    } finally {
      setIsSaving(false);
    }
  };

  // تبديل قائمة في الوضع المخصص
  const toggleCustomMenu = (menuKey: string) => {
    setCustomMenus(prev => {
      if (prev.includes(menuKey)) {
        return prev.filter(k => k !== menuKey);
      } else {
        return [...prev, menuKey];
      }
    });
  };

  // الحصول على وصف القالب المحدد
  const getPresetDescription = () => {
    if (selectedPreset === 'custom' && isCustomMode) {
      return `${interfaceLabel} — ${allowedCustomMenus.length} قائمة محددة يدوياً`;
    }
    const preset = availablePresets.find(p => p.id === selectedPreset);
    return preset?.description || '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* الرأس */}
        <div className="bg-gradient-to-r from-accent-600 to-accent-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">إدارة الصلاحيات</h2>
              <p className="text-white/90 text-sm">
                {user.name} - {user.role}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* معلومات الواجهة لتجنب الالتباس */}
          <div className="mb-6 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">واجهة المستخدم (تلقائي)</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  تم التعرف على: <span className="font-semibold">{interfaceLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canSwitchInterfaceFilter && detectedInterfaceMode !== 'projects'}
                  onClick={() => setInterfaceFilter('projects')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    interfaceFilter === 'projects'
                      ? 'bg-accent-600 text-white border-accent-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-700'
                  }`}
                >
                  مبيعات
                </button>
                <button
                  type="button"
                  disabled={!canSwitchInterfaceFilter && detectedInterfaceMode !== 'expenses'}
                  onClick={() => setInterfaceFilter('expenses')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    interfaceFilter === 'expenses'
                      ? 'bg-accent-600 text-white border-accent-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-700'
                  }`}
                >
                  حسابات
                </button>
                <button
                  type="button"
                  disabled={!canSwitchInterfaceFilter}
                  onClick={() => setInterfaceFilter('both')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    interfaceFilter === 'both'
                      ? 'bg-accent-600 text-white border-accent-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-700'
                  }`}
                >
                  الكل
                </button>
              </div>
            </div>
          </div>

          {/* اختيار القالب */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              اختر مستوى الصلاحيات
            </h3>
            <div className="space-y-3">
              {availablePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setIsCustomMode(false);
                    // تطبيق صلاحيات الأزرار من القالب
                    if (preset.buttonPermissions) {
                      setButtonPermissions(preset.buttonPermissions);
                    }
                  }}
                  className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                    selectedPreset === preset.id && !isCustomMode
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {preset.label}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {preset.description}
                      </div>
                      <div className="text-xs text-accent-600 dark:text-accent-400 mt-2">
                        {preset.menus.length} قائمة متاحة
                      </div>
                    </div>
                    {selectedPreset === preset.id && !isCustomMode && (
                      <CheckIcon className="w-6 h-6 text-accent-600 dark:text-accent-400 flex-shrink-0 mr-3" />
                    )}
                  </div>
                </button>
              ))}
              
              {/* خيار التخصيص اليدوي */}
              <button
                onClick={() => {
                  setSelectedPreset('custom');
                  setIsCustomMode(true);
                }}
                className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                  isCustomMode
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      تخصيص يدوي
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      اختر القوائم المحددة التي تريدها
                    </div>
                    {isCustomMode && (
                      <div className="text-xs text-accent-600 dark:text-accent-400 mt-2">
                        {allowedCustomMenus.length} قائمة محددة
                      </div>
                    )}
                  </div>
                  {isCustomMode && (
                    <CheckIcon className="w-6 h-6 text-accent-600 dark:text-accent-400 flex-shrink-0 mr-3" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* اختيار القوائم المخصصة */}
          {isCustomMode && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
                اختر القوائم المتاحة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableMenus.map((menu) => (
                  <label
                    key={menu.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      customMenus.includes(menu.key)
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={customMenus.includes(menu.key)}
                      onChange={() => toggleCustomMenu(menu.key)}
                      className="w-5 h-5 text-accent-600 rounded border-slate-300 focus:ring-accent-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {menu.label}
                    </span>
                  </label>
                ))}
              </div>
              
              {/* صلاحيات الأزرار */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
                  صلاحيات الأزرار
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      زر الإضافة (Add)
                    </span>
                    <input
                      type="checkbox"
                      checked={buttonPermissions.canAdd}
                      onChange={(e) => setButtonPermissions(prev => ({ ...prev, canAdd: e.target.checked }))}
                      className="w-5 h-5 text-accent-600 rounded border-slate-300 focus:ring-accent-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      زر التعديل (Edit)
                    </span>
                    <input
                      type="checkbox"
                      checked={buttonPermissions.canEdit}
                      onChange={(e) => setButtonPermissions(prev => ({ ...prev, canEdit: e.target.checked }))}
                      className="w-5 h-5 text-accent-600 rounded border-slate-300 focus:ring-accent-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 rounded-lg border border-rose-200 dark:border-rose-800 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20">
                    <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
                      زر الحذف (Delete)
                    </span>
                    <input
                      type="checkbox"
                      checked={buttonPermissions.canDelete}
                      onChange={(e) => setButtonPermissions(prev => ({ ...prev, canDelete: e.target.checked }))}
                      className="w-5 h-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      زر التصدير (Export)
                    </span>
                    <input
                      type="checkbox"
                      checked={buttonPermissions.canExport}
                      onChange={(e) => setButtonPermissions(prev => ({ ...prev, canExport: e.target.checked }))}
                      className="w-5 h-5 text-accent-600 rounded border-slate-300 focus:ring-accent-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      زر الطباعة (Print)
                    </span>
                    <input
                      type="checkbox"
                      checked={buttonPermissions.canPrint}
                      onChange={(e) => setButtonPermissions(prev => ({ ...prev, canPrint: e.target.checked }))}
                      className="w-5 h-5 text-accent-600 rounded border-slate-300 focus:ring-accent-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* معاينة الصلاحيات */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 text-sm">
                <div className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  معاينة الصلاحيات
                </div>
                <div className="text-blue-700 dark:text-blue-300">
                  {getPresetDescription()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الأزرار */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (isCustomMode && allowedCustomMenus.length === 0)}
              className="px-6 py-2.5 rounded-lg font-medium bg-accent-600 hover:bg-accent-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  حفظ الصلاحيات
                </>
              )}
            </button>
          </div>
          {isCustomMode && allowedCustomMenus.length === 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">
              يجب اختيار قائمة واحدة على الأقل
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimplePermissionsManager;
