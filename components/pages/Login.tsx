import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usersService } from '../../src/services/supabaseService';

const Login: React.FC = () => {
  const { login, signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Admin' | 'Sales' | 'Accounting'>('Sales');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = isRegistering 
        ? await signUp(username, password, name, role)
        : await login(username, password);

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!username.trim()) {
      setError('الرجاء إدخال اسم المستخدم أولاً');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create password reset notification
      await usersService.createPasswordResetNotification(username);
      setForgotPasswordSuccess(true);
      setShowForgotPassword(false);
      setTimeout(() => setForgotPasswordSuccess(false), 5000);
    } catch (err) {
      setError('فشل إرسال طلب استعادة كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 font-sans transition-colors duration-300">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-400">نظام عقاري</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {isRegistering ? 'تسجيل حساب جديد' : 'تسجيل الدخول إلى حسابك'}
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  الاسم الكامل
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="أحمد محمد"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  الدور الوظيفي
                </label>
                <div className="mt-1">
                  <select
                    id="role"
                    name="role"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'Admin' | 'Sales' | 'Accounting')}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="Sales">مبيعات</option>
                    <option value="Accounting">محاسبة</option>
                    <option value="Admin">مدير</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              اسم المستخدم
            </label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="username"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              كلمة المرور
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                dir="ltr"
              />
            </div>
            {!isRegistering && (
              <div className="mt-2 text-left">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {forgotPasswordSuccess && (
            <div className="text-green-600 text-sm text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              تم إرسال طلب استعادة كلمة المرور للمدير. سيتم التواصل معك قريباً.
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'جاري التحميل...' : isRegistering ? 'تسجيل حساب جديد' : 'تسجيل الدخول'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium focus:outline-none"
            >
              {isRegistering ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ سجل الآن'}
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">نسيت كلمة المرور</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              سيتم إرسال طلب استعادة كلمة المرور للمدير. الرجاء التأكد من إدخال اسم المستخدم الصحيح.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                placeholder="اسم المستخدم"
                dir="ltr"
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm mb-4">{error}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;