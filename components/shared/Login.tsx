import React, { useState, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { useAuth } from '../../contexts/AuthContext';
import { usersService } from '../../src/services/supabaseService';

// Inline Icons to avoid dependency issues
const UserIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LockIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const EyeIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.68 0 1.35-.06 1.99-.17"></path>
    <line x1="2" y1="2" x2="22" y2="22"></line>
  </svg>
);

const Login: React.FC = () => {
  const { login, setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  // GSAP Animation Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glow1Ref = useRef<HTMLDivElement>(null);
  const glow2Ref = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successIconRef = useRef<HTMLDivElement>(null);

  // 🎬 Initial page load animation
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Animate glowing orbs
      if (glow1Ref.current && glow2Ref.current) {
        gsap.set([glow1Ref.current, glow2Ref.current], { scale: 0, opacity: 0 });
        tl.to([glow1Ref.current, glow2Ref.current], {
          scale: 1,
          opacity: 1,
          duration: 1.5,
          ease: "power2.out",
          stagger: 0.2
        }, 0);

        // Continuous floating animation for orbs
        gsap.to(glow1Ref.current, {
          y: -30,
          x: 20,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
        gsap.to(glow2Ref.current, {
          y: 20,
          x: -30,
          duration: 5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }

      // Animate header
      if (headerRef.current) {
        const h1 = headerRef.current.querySelector('h1');
        const p = headerRef.current.querySelector('p');
        gsap.set([h1, p], { opacity: 0, y: -30 });
        tl.to(h1, { opacity: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }, 0.3);
        tl.to(p, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.5);
      }

      // Animate card
      if (cardRef.current) {
        gsap.set(cardRef.current, { opacity: 0, y: 50, scale: 0.9 });
        tl.to(cardRef.current, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "back.out(1.4)"
        }, 0.4);
      }

      // Animate form fields
      if (formRef.current) {
        const formElements = formRef.current.querySelectorAll('.form-field');
        gsap.set(formElements, { opacity: 0, x: -20 });
        tl.to(formElements, {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out"
        }, 0.7);
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // 🎬 Login success animation - Simple and clean
  const playLoginSuccessAnimation = () => {
    return new Promise<void>((resolve) => {
      setIsLoggingIn(true);
      
      const tl = gsap.timeline({
        onComplete: () => resolve()
      });

      // Hide form elements
      if (formRef.current) {
        tl.to(formRef.current, {
          opacity: 0,
          scale: 0.95,
          duration: 0.3,
          ease: "power2.in"
        }, 0);
      }

      // Show success icon inside card
      if (successIconRef.current) {
        tl.set(successIconRef.current, { display: 'flex' }, 0.2);
        tl.fromTo(successIconRef.current,
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" },
          0.3
        );
      }

      // Card gets green glow
      if (cardRef.current) {
        tl.to(cardRef.current, {
          boxShadow: "0 0 40px 10px rgba(16, 185, 129, 0.5)",
          borderColor: "rgba(16, 185, 129, 0.8)",
          duration: 0.4,
          ease: "power2.out"
        }, 0.3);
      }

      // Brief pause then fade everything out
      tl.to(cardRef.current, {
        opacity: 0,
        y: -30,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.in"
      }, 1.2);

      // Header fades out
      if (headerRef.current) {
        tl.to(headerRef.current, {
          opacity: 0,
          y: -20,
          duration: 0.3,
          ease: "power2.in"
        }, 1.2);
      }

      // Glow orbs fade out gently
      if (glow1Ref.current && glow2Ref.current) {
        tl.to([glow1Ref.current, glow2Ref.current], {
          opacity: 0,
          duration: 0.4,
          ease: "power2.in"
        }, 1.2);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error, user } = await login(username, password);

      if (error) {
        // Error shake animation
        if (cardRef.current) {
          gsap.to(cardRef.current, {
            x: [-10, 10, -10, 10, 0],
            duration: 0.4,
            ease: "power2.out"
          });
        }
        setError(error.message);
        setLoading(false);
      } else if (user) {
        // Store user for later and play success animation
        setPendingUser(user);
        setLoading(false);
        // Play success animation then set user
        await playLoginSuccessAnimation();
        // Now set the user to trigger navigation
        setUser(user);
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.');
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
    <div ref={containerRef} dir="rtl" className="flex items-center justify-center min-h-screen bg-slate-900 font-sans relative overflow-hidden">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      {/* Decorative Glow Effects */}
      <div ref={glow1Ref} className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div ref={glow2Ref} className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md p-8 space-y-8 relative z-10">
        {/* Header Text */}
        <div ref={headerRef} className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wide">إدارة المجمعات - البيانات المالية</h1>
          <p className="text-slate-400 text-sm font-light tracking-wider uppercase">Complex Management & Finance</p>
        </div>

        {/* Glassmorphism Card */}
        <div ref={cardRef} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl shadow-black/50 transition-all duration-300 relative overflow-hidden">
          {/* Success Icon (hidden by default) */}
          <div 
            ref={successIconRef} 
            className="absolute inset-0 flex-col items-center justify-center bg-slate-900/95 z-20"
            style={{ display: 'none' }}
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/50">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-bold text-white">تم تسجيل الدخول بنجاح!</p>
            <p className="text-emerald-400 text-sm mt-2">جاري التحويل...</p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              تسجيل الدخول
            </h2>
          </div>

          <form ref={formRef} className="space-y-6" onSubmit={handleSubmit}>

            <div className="form-field">
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon size={18} />
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

            <div className="form-field">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <LockIcon size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              <div className="mt-2 text-left">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            </div>

            {error && (
              <div className="form-field text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-900/50">{error}</div>
            )}

            {forgotPasswordSuccess && (
              <div className="form-field text-green-400 text-sm text-center bg-green-900/20 p-3 rounded-lg border border-green-900/50">
                تم إرسال طلب استعادة كلمة المرور للمدير. سيتم التواصل معك قريباً.
              </div>
            )}

            <div className="form-field">
              <button
                type="submit"
                disabled={loading || isLoggingIn}
                className="btn-primary w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold disabled:opacity-50 relative overflow-hidden group"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري التحميل...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
                <span className="absolute inset-0 bg-white/20 transform -skewX-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
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
                  <UserIcon size={18} />
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
                className="btn-primary flex-1 disabled:opacity-50"
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