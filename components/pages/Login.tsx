import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usersService } from '../../src/services/supabaseService';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);

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
    <div dir="rtl" className="flex items-center justify-center min-h-screen bg-slate-900 font-sans relative overflow-hidden">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      
      {/* Decorative Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md p-8 space-y-8 relative z-10">
        {/* Header Text */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wide">إدارة المجمعات - البيانات المالية</h1>
          <p className="text-slate-400 text-sm font-light tracking-wider uppercase">Complex Management & Finance</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl shadow-black/50">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              {isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h2>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {isRegistering && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <User size={18} />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pr-10 pl-3 py-3 bg-slate-800/50 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 placeholder-slate-500 transition-all"
                      placeholder="أحمد محمد"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-1">
                    الدور الوظيفي
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'Admin' | 'Sales' | 'Accounting')}
                      className="w-full px-3 py-3 bg-slate-800/50 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 appearance-none transition-all"
                    >
                      <option value="Sales" className="bg-slate-800 text-white">مبيعات</option>
                      <option value="Accounting" className="bg-slate-800 text-white">محاسبة</option>
                      <option value="Admin" className="bg-slate-800 text-white">مدير</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-3 py-3 bg-slate-800/50 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 placeholder-slate-500 transition-all"
                  placeholder="اسم المستخدم"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-10 py-3 bg-slate-800/50 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 placeholder-slate-500 transition-all"
                  placeholder="كلمة المرور"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isRegistering && (
                <div className="mt-2 text-left">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-900/50">{error}</div>
            )}

            {forgotPasswordSuccess && (
              <div className="text-green-400 text-sm text-center bg-green-900/20 p-3 rounded-lg border border-green-900/50">
                تم إرسال طلب استعادة كلمة المرور للمدير. سيتم التواصل معك قريباً.
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'جاري التحميل...' : isRegistering ? 'تسجيل حساب جديد' : 'تسجيل الدخول'}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-slate-400 hover:text-white text-sm font-medium focus:outline-none transition-colors"
              >
                {isRegistering ? 'لديك حساب بالفعل؟ سجل دخولك' : 'إنشاء حساب جديد'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">نسيت كلمة المرور</h3>
            <p className="text-slate-300 mb-4">
              سيتم إرسال طلب استعادة كلمة المرور للمدير. الرجاء التأكد من إدخال اسم المستخدم الصحيح.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  placeholder="اسم المستخدم"
                  dir="ltr"
                />
              </div>
            </div>
            {error && (
              <div className="text-red-400 text-sm mb-4">{error}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 rounded-lg hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 transition-all"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 border border-slate-600 text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-700 transition-all"
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