/**
 * اختبار سريع للإصلاحات الأمنية
 * قم بتشغيل هذا الملف في Console المتصفح لاختبار النظام
 */

console.log('🔒 بدء اختبار الإصلاحات الأمنية...\n');

// ===== اختبار 1: التحقق من عدم وجود password في localStorage =====
console.log('1️⃣ اختبار: التحقق من localStorage...');
try {
  const authUser = localStorage.getItem('auth_user');
  if (authUser) {
    const user = JSON.parse(authUser);
    if (user.password) {
      console.error('❌ فشل: password موجود في localStorage!');
      console.error('   القيمة:', user.password.substring(0, 20) + '...');
    } else {
      console.log('✅ نجح: لا يوجد password في localStorage');
      console.log('   البيانات المخزنة:', Object.keys(user).join(', '));
    }
  } else {
    console.log('⚠️  لا يوجد مستخدم مسجل دخول');
  }
} catch (error) {
  console.error('❌ خطأ في الاختبار:', error);
}

// ===== اختبار 2: التحقق من Rate Limiter =====
console.log('\n2️⃣ اختبار: التحقق من Rate Limiter...');
try {
  const loginAttempts = localStorage.getItem('login_attempts');
  if (loginAttempts) {
    const attempts = JSON.parse(loginAttempts);
    console.log('✅ Rate Limiter موجود');
    console.log(`   عدد المستخدمين المتتبعين: ${attempts.length}`);
    if (attempts.length > 0) {
      attempts.forEach(([username, userAttempts]) => {
        console.log(`   - ${username}: ${userAttempts.length} محاولة`);
      });
    }
  } else {
    console.log('ℹ️  لا توجد محاولات فاشلة مسجلة (هذا جيد!)');
  }
} catch (error) {
  console.error('❌ خطأ في الاختبار:', error);
}

// ===== اختبار 3: التحقق من Validation Functions =====
console.log('\n3️⃣ اختبار: التحقق من دوال Validation...');

// اختبار Email
const testEmail = 'test@example.com';
console.log(`   - validateEmail("${testEmail}"): يجب أن يكون valid`);

// اختبار Username
const testUsername = 'admin';
console.log(`   - validateUsername("${testUsername}"): يجب أن يكون valid`);

// اختبار Amount
const testAmount = 1000;
console.log(`   - validateAmount(${testAmount}): يجب أن يكون valid`);

const testNegativeAmount = -100;
console.log(`   - validateAmount(${testNegativeAmount}): يجب أن يكون invalid`);

console.log('   ℹ️  للاختبار الفعلي، استخدم import من validation.ts في الكود');

// ===== اختبار 4: التحقق من sanitizeText =====
console.log('\n4️⃣ اختبار: التحقق من sanitizeText...');
const dangerousText = '<script>alert("XSS")</script>';
console.log(`   النص الخطير: ${dangerousText}`);
console.log('   بعد التنظيف: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
console.log('   ℹ️  للاختبار الفعلي، استخدم import من validation.ts في الكود');

// ===== اختبار 5: محاكاة Rate Limiting =====
console.log('\n5️⃣ اختبار: محاكاة Rate Limiting...');
console.log('   جرب تسجيل الدخول بكلمة مرور خاطئة 5 مرات:');
console.log('   المحاولة 1: "كلمة المرور غير صحيحة. المحاولات المتبقية: 4"');
console.log('   المحاولة 2: "كلمة المرور غير صحيحة. المحاولات المتبقية: 3"');
console.log('   المحاولة 3: "كلمة المرور غير صحيحة. المحاولات المتبقية: 2"');
console.log('   المحاولة 4: "كلمة المرور غير صحيحة. المحاولات المتبقية: 1"');
console.log('   المحاولة 5: "كلمة المرور غير صحيحة. المحاولات المتبقية: 0"');
console.log('   المحاولة 6: "تم حظر تسجيل الدخول مؤقتاً. الرجاء المحاولة بعد 15 دقيقة"');

// ===== النتيجة النهائية =====
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 ملخص الاختبار:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ localStorage - تم الفحص');
console.log('✅ Rate Limiter - تم الفحص');
console.log('ℹ️  Validation - يحتاج اختبار يدوي');
console.log('ℹ️  Sanitization - يحتاج اختبار يدوي');
console.log('\n📝 للاختبار الكامل:');
console.log('1. جرب تسجيل الدخول بكلمة مرور خاطئة 5 مرات');
console.log('2. حاول إضافة مستخدم بـ email خاطئ');
console.log('3. حاول إضافة expense بمبلغ سالب');
console.log('4. افحص localStorage بعد تسجيل الدخول');
console.log('\n✨ انتهى الاختبار!');
