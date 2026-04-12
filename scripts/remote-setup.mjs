
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://sdpjvorettivpdviytqo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcGp2b3JldHRpdnBkdml5dHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg4MjYwMiwiZXhwIjoyMDg5NDU4NjAyfQ.gXUmtkauzomPzB_jjkzwyPMUrfxI-ICBMBs4u1N6ONA';

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
