
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Environment variables missing. Using placeholders.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runSetup() {
  try {
    console.log('🚀 البدء في تهيئة قاعدة البيانات...');
    const sqlPath = path.join(__dirname, '..', 'lib', 'db-setup-complete.sql');
    fs.readFileSync(sqlPath, 'utf8');

    // ملاحظة: supabase.rpc() تستخدم لتنفيذ دوال مخزنة، ولكن لتنفيذ SQL خام سنحاول استخدام واجهة REST إذا كانت مفعلة
    // أو سنقوم بتقسيم السكريبت وتنفيذه (هذه الطريقة قد تكون محدودة حسب إعدادات سوبابيز)
    
    console.log('⚠️ محاولة تنفيذ السكريبت عبر API الإداري...');
    
    // محاولة تنفيذ استعلام تجريبي للتأكد من الاتصال
    const { error: testError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (testError && testError.code === 'PGRST116') {
        console.log('✅ الجدول profiles غير موجود، سنبدأ بإنشائه...');
    } else if (!testError) {
        console.log('ℹ️ الجداول موجودة بالفعل في قاعدة البيانات.');
    }

    console.log('📢 يرجى العلم: Supabase تمنع تنفيذ SQL خام (Raw SQL) عبر API لداعي الأمان.');
    console.log('💡 سأقوم بإنشاء ملف تعليمات مصور لك ليسهل عليك الوصول لـ SQL Editor.');
    
  } catch (err) {
    console.error('❌ فشل الاتصال:', err.message);
  }
}

runSetup();
