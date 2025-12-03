/**
 * Script لتشفير كلمات المرور الموجودة في قاعدة البيانات
 * 
 * هذا الـ script يجب تشغيله مرة واحدة فقط بعد:
 * 1. تشغيل migration: hash-existing-passwords.sql
 * 2. نشر التطبيق بنظام التشفير الجديد
 * 
 * لتشغيل الـ script:
 * npx tsx scripts/migrate-passwords.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// إعدادات Supabase
const SUPABASE_URL = 'https://dlxtduzxlwogpwxjeqxm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ خطأ: يجب تعيين متغير البيئة SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const SALT_ROUNDS = 10;

interface User {
  id: string;
  username: string;
  password: string;
  password_migrated: boolean;
}

async function migratePasswords() {
  console.log('🔐 بدء عملية تشفير كلمات المرور...\n');

  try {
    // جلب المستخدمين الذين لم يتم تشفير كلمات مرورهم
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, username, password, password_migrated')
      .eq('password_migrated', false);

    if (fetchError) {
      console.error('❌ خطأ في جلب المستخدمين:', fetchError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('✅ لا توجد كلمات مرور تحتاج إلى تشفير');
      return;
    }

    console.log(`📊 عدد المستخدمين الذين يحتاجون تشفير: ${users.length}\n`);

    let successCount = 0;
    let failCount = 0;

    for (const user of users as User[]) {
      try {
        console.log(`🔄 معالجة المستخدم: ${user.username}...`);

        // تحقق مما إذا كانت كلمة المرور مشفرة بالفعل (تبدأ بـ $2a$ أو $2b$)
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          console.log(`  ⏭️  كلمة المرور مشفرة بالفعل، تخطي...`);
          
          // تحديث حالة التشفير فقط
          await supabase.rpc('mark_password_migrated', { user_id_param: user.id });
          successCount++;
          continue;
        }

        // تشفير كلمة المرور النصية
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

        // تحديث كلمة المرور في قاعدة البيانات
        const { error: updateError } = await supabase
          .from('users')
          .update({ password: hashedPassword })
          .eq('id', user.id);

        if (updateError) {
          console.error(`  ❌ فشل تحديث المستخدم ${user.username}:`, updateError);
          failCount++;
          continue;
        }

        // تحديث حالة التشفير
        await supabase.rpc('mark_password_migrated', { user_id_param: user.id });

        console.log(`  ✅ تم تشفير كلمة مرور ${user.username} بنجاح`);
        successCount++;

      } catch (error) {
        console.error(`  ❌ خطأ في معالجة المستخدم ${user.username}:`, error);
        failCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 ملخص العملية:');
    console.log(`  ✅ نجح: ${successCount}`);
    console.log(`  ❌ فشل: ${failCount}`);
    console.log(`  📊 المجموع: ${users.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (successCount === users.length) {
      console.log('🎉 تم تشفير جميع كلمات المرور بنجاح!');
      console.log('\n📝 الخطوات التالية:');
      console.log('  1. اختبار تسجيل الدخول للتأكد من عمل النظام');
      console.log('  2. يمكنك حذف جدول password_migration_log بعد التأكد');
      console.log('  3. يمكنك حذف حقل password_migrated من جدول users');
    } else {
      console.log('⚠️  بعض كلمات المرور لم يتم تشفيرها. الرجاء مراجعة الأخطاء أعلاه.');
    }

  } catch (error) {
    console.error('❌ خطأ عام في عملية التشفير:', error);
  }
}

// تشغيل الـ script
migratePasswords().then(() => {
  console.log('\n✨ انتهى تنفيذ الـ script');
  process.exit(0);
}).catch((error) => {
  console.error('❌ فشل تنفيذ الـ script:', error);
  process.exit(1);
});
