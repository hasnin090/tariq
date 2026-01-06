/**
 * 🔄 Script لترحيل المستخدمين إلى Supabase Auth
 * 
 * هذا الـ script يقوم بـ:
 * 1. جلب جميع المستخدمين من جدول users
 * 2. إنشاء حسابات لهم في Supabase Auth
 * 3. ربط الحسابات عبر auth_id
 * 
 * ⚠️ يجب تشغيل هذا الـ script مرة واحدة فقط
 * 
 * الاستخدام:
 * npx ts-node scripts/migrate-users-to-auth.ts
 */

import { createClient } from '@supabase/supabase-js';

// ⚠️ استخدم Service Role Key (ليس Anon Key)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dlxtduzxlwogpwxjeqxm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is required');
  console.log('');
  console.log('📝 كيفية الحصول على Service Role Key:');
  console.log('1. افتح Supabase Dashboard');
  console.log('2. اذهب إلى Settings → API');
  console.log('3. انسخ "service_role" key (ليس anon key)');
  console.log('');
  console.log('⚠️ تحذير: لا تشارك هذا المفتاح أبداً!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  auth_id?: string;
}

async function migrateUsers() {
  console.log('🚀 بدء ترحيل المستخدمين إلى Supabase Auth...\n');

  // 1. جلب المستخدمين الذين ليس لديهم auth_id
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, name, username, email, password, role, auth_id')
    .is('auth_id', null);

  if (fetchError) {
    console.error('❌ فشل جلب المستخدمين:', fetchError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('✅ جميع المستخدمين مرتبطين بـ Supabase Auth بالفعل!');
    return;
  }

  console.log(`📋 تم العثور على ${users.length} مستخدم للترحيل:\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: { user: string; error: string }[] = [];

  for (const user of users as User[]) {
    console.log(`👤 معالجة: ${user.username} (${user.email})...`);

    try {
      // التحقق من أن كلمة المرور موجودة
      if (!user.password) {
        console.log(`   ⚠️ لا توجد كلمة مرور - سيتم إنشاء كلمة مرور مؤقتة`);
        user.password = generateTempPassword();
        console.log(`   📝 كلمة المرور المؤقتة: ${user.password}`);
      }

      // تحديد كلمة المرور للاستخدام
      let passwordToUse = user.password;
      
      // إذا كانت كلمة المرور مشفرة بـ bcrypt، نحتاج لإعادة تعيينها
      const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      if (isBcryptHash) {
        // نستخدم كلمة مرور مؤقتة للمستخدمين ذوي كلمات المرور المشفرة
        passwordToUse = generateTempPassword();
        console.log(`   ⚠️ كلمة المرور مشفرة - سيتم إنشاء كلمة مرور مؤقتة`);
        console.log(`   📝 كلمة المرور المؤقتة للمستخدم ${user.username}: ${passwordToUse}`);
      }

      // إنشاء حساب في Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: passwordToUse,
        email_confirm: true, // تأكيد البريد تلقائياً
        user_metadata: {
          name: user.name,
          username: user.username,
          role: user.role
        }
      });

      if (authError) {
        // إذا كان المستخدم موجود، حاول جلب معرفه
        if (authError.message.includes('already been registered') || 
            authError.message.includes('already exists')) {
          console.log(`   📧 المستخدم موجود بالفعل في Auth، جاري الربط...`);
          
          // البحث عن المستخدم بالبريد
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === user.email);
          
          if (existingUser) {
            // تحديث auth_id
            const { error: updateError } = await supabase
              .from('users')
              .update({ auth_id: existingUser.id })
              .eq('id', user.id);

            if (updateError) {
              throw updateError;
            }
            
            console.log(`   ✅ تم ربط المستخدم بنجاح!`);
            successCount++;
          } else {
            throw new Error('لم يتم العثور على المستخدم في Auth');
          }
        } else {
          throw authError;
        }
      } else if (authData.user) {
        // تحديث auth_id في جدول users
        const { error: updateError } = await supabase
          .from('users')
          .update({ auth_id: authData.user.id })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`   ✅ تم إنشاء حساب Auth وربطه بنجاح!`);
        successCount++;
      }
    } catch (error: any) {
      console.log(`   ❌ فشل: ${error.message}`);
      errors.push({ user: user.username, error: error.message });
      errorCount++;
    }

    console.log(''); // سطر فارغ بين المستخدمين
  }

  // ملخص النتائج
  console.log('\n' + '═'.repeat(50));
  console.log('📊 ملخص الترحيل:');
  console.log('═'.repeat(50));
  console.log(`✅ نجح: ${successCount}`);
  console.log(`❌ فشل: ${errorCount}`);
  console.log(`📋 الإجمالي: ${users.length}`);

  if (errors.length > 0) {
    console.log('\n❌ المستخدمين الذين فشل ترحيلهم:');
    errors.forEach(e => {
      console.log(`   • ${e.user}: ${e.error}`);
    });
  }

  console.log('\n' + '═'.repeat(50));
  
  if (successCount > 0) {
    console.log('\n⚠️ ملاحظات مهمة:');
    console.log('1. المستخدمين ذوي كلمات المرور المشفرة حصلوا على كلمات مرور مؤقتة');
    console.log('2. يجب إخبارهم بتغيير كلمات المرور عند أول تسجيل دخول');
    console.log('3. يمكنك الآن تنفيذ RLS Policies بأمان');
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// تشغيل الترحيل
migrateUsers().catch(console.error);
