-- إضافة حقول username و password إلى جدول users
-- Migration: Add username and password columns to users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password TEXT;

-- إنشاء فهرس لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);

-- تحديث السجلات الموجودة لتعيين username من email أو name
UPDATE public.users
SET
    username = COALESCE(email, name)
WHERE
    username IS NULL;

-- جعل username مطلوباً
ALTER TABLE public.users ALTER COLUMN username SET NOT NULL;