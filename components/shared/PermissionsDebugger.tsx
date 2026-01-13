import React, { useState } from 'react';
import { useAuth, AuthUser } from '../../contexts/AuthContext';
import { SYSTEM_MENUS, SYSTEM_RESOURCES, hasCustomMenuAccess, hasCustomResourcePermissions, hasCustomButtonAccess } from '../../utils/permissions';

/**
 * مكون لعرض معلومات الصلاحيات للمستخدم الحالي
 * يساعد في تشخيص مشاكل الصلاحيات
 */
export const PermissionsDebugger: React.FC = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'menus' | 'resources' | 'buttons'>('menus');

  if (!currentUser) return null;

  const customMenuAccess = (currentUser as AuthUser).customMenuAccess || [];
  const customPermissions = (currentUser as AuthUser).customPermissions || [];
  const customButtonAccess = (currentUser as AuthUser).customButtonAccess || [];
  const projectAssignments = (currentUser as AuthUser).projectAssignments || [];

  const hasCustomMenus = hasCustomMenuAccess(customMenuAccess);
  const hasCustomPerms = hasCustomResourcePermissions(customPermissions);
  const hasCustomButtons = hasCustomButtonAccess(customButtonAccess);

  // ✅ إحصائيات القوائم
  const visibleMenusCount = customMenuAccess.filter(m => m.isVisible).length;
  const hiddenMenusCount = customMenuAccess.filter(m => !m.isVisible).length;

  // ✅ إحصائيات الموارد
  const resourcesWithAccess = customPermissions.filter(p => p.canView || p.canEdit || p.canDelete || p.canCreate).length;
  const resourcesNoAccess = customPermissions.filter(p => !p.canView && !p.canEdit && !p.canDelete && !p.canCreate).length;

  // ✅ إحصائيات الأزرار
  const visibleButtonsCount = customButtonAccess.filter(b => b.isVisible).length;
  const hiddenButtonsCount = customButtonAccess.filter(b => !b.isVisible).length;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* زر فتح/إغلاق */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-lg border border-slate-600 transition-all duration-200 flex items-center gap-2"
        title="معلومات الصلاحيات"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-sm font-medium">الصلاحيات</span>
        {(hasCustomMenus || hasCustomPerms || hasCustomButtons) && (
          <span className="bg-accent-500 text-white text-xs px-2 py-0.5 rounded-full">مخصص</span>
        )}
      </button>

      {/* لوحة المعلومات */}
      {isOpen && (
        <div className="absolute bottom-14 left-0 w-96 max-h-[600px] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* رأس اللوحة */}
          <div className="bg-gradient-to-r from-accent-600 to-accent-500 text-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">معلومات الصلاحيات</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-sm opacity-90">
              <p><strong>المستخدم:</strong> {currentUser.name}</p>
              <p><strong>الدور:</strong> {currentUser.role}</p>
            </div>
          </div>

          {/* التبويبات */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('menus')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'menus'
                  ? 'bg-white dark:bg-slate-800 text-accent-600 border-b-2 border-accent-600'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              القوائم ({visibleMenusCount})
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'resources'
                  ? 'bg-white dark:bg-slate-800 text-accent-600 border-b-2 border-accent-600'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              الموارد ({resourcesWithAccess})
            </button>
            <button
              onClick={() => setActiveTab('buttons')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'buttons'
                  ? 'bg-white dark:bg-slate-800 text-accent-600 border-b-2 border-accent-600'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              الأزرار ({visibleButtonsCount})
            </button>
          </div>

          {/* المحتوى */}
          <div className="p-4 overflow-y-auto max-h-[400px]">
            {/* تبويب القوائم */}
            {activeTab === 'menus' && (
              <div className="space-y-2">
                {!hasCustomMenus ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    <p className="text-sm">استخدام الصلاحيات الافتراضية</p>
                    <p className="text-xs mt-2">حسب دور: {currentUser.role}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-3">
                      <span>✅ مرئية: {visibleMenusCount}</span>
                      <span>❌ مخفية: {hiddenMenusCount}</span>
                    </div>
                    {customMenuAccess.map((menu) => (
                      <div
                        key={menu.menuKey}
                        className={`flex items-center justify-between p-2 rounded border text-sm ${
                          menu.isVisible
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {SYSTEM_MENUS.find(m => m.key === menu.menuKey)?.label || menu.menuKey}
                        </span>
                        <span className={menu.isVisible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {menu.isVisible ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* تبويب الموارد */}
            {activeTab === 'resources' && (
              <div className="space-y-2">
                {!hasCustomPerms ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    <p className="text-sm">استخدام الصلاحيات الافتراضية</p>
                    <p className="text-xs mt-2">حسب دور: {currentUser.role}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-3">
                      <span>✅ مفعلة: {resourcesWithAccess}</span>
                      <span>❌ معطلة: {resourcesNoAccess}</span>
                    </div>
                    {customPermissions.map((perm) => {
                      const hasAnyAccess = perm.canView || perm.canEdit || perm.canDelete || perm.canCreate;
                      return (
                        <div
                          key={perm.resource}
                          className={`p-2 rounded border text-sm ${
                            hasAnyAccess
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {SYSTEM_RESOURCES.find(r => r.key === perm.resource)?.label || perm.resource}
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className={perm.canView ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                              {perm.canView ? '✓' : '✗'} عرض
                            </span>
                            <span className={perm.canCreate ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                              {perm.canCreate ? '✓' : '✗'} إضافة
                            </span>
                            <span className={perm.canEdit ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                              {perm.canEdit ? '✓' : '✗'} تعديل
                            </span>
                            <span className={perm.canDelete ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                              {perm.canDelete ? '✓' : '✗'} حذف
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* تبويب الأزرار */}
            {activeTab === 'buttons' && (
              <div className="space-y-2">
                {!hasCustomButtons ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    <p className="text-sm">استخدام الصلاحيات الافتراضية</p>
                    <p className="text-xs mt-2">كل الأزرار مرئية</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-3">
                      <span>✅ مرئية: {visibleButtonsCount}</span>
                      <span>❌ مخفية: {hiddenButtonsCount}</span>
                    </div>
                    {customButtonAccess.map((btn, index) => (
                      <div
                        key={`${btn.pageKey}-${btn.buttonKey}-${index}`}
                        className={`flex items-center justify-between p-2 rounded border text-sm ${
                          btn.isVisible
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {btn.buttonKey}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            الصفحة: {btn.pageKey === '*' ? 'جميع الصفحات' : btn.pageKey}
                          </div>
                        </div>
                        <span className={btn.isVisible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {btn.isVisible ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* معلومات المشاريع المعينة */}
          {projectAssignments && projectAssignments.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">المشاريع المعينة:</h4>
              <div className="space-y-1">
                {projectAssignments.map((proj, index) => (
                  <div key={index} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent-500 rounded-full"></span>
                    <span>{proj.projectName || proj.projectId}</span>
                    <span className="text-slate-400">({proj.interfaceMode === 'projects' ? 'مبيعات' : 'محاسبة'})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PermissionsDebugger;
