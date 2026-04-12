
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables for storage setup');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('🛠️ جاري تهيئة مساحة التخزين (Supabase Storage)...');
  
  try {
    // 1. Create the 'invoices' bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) throw listError;
    
    const bucketExists = buckets.find(b => b.name === 'invoices');
    
    if (!bucketExists) {
      console.log('📁 جاري إنشاء حاوية "invoices"...');
      const { error: createError } = await supabase.storage.createBucket('invoices', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) throw createError;
      console.log('✅ تم إنشاء حاوية "invoices" بنجاح.');
    } else {
      console.log('ℹ️ حاوية "invoices" موجودة بالفعل.');
    }

    // 2. Create the 'app-updates' bucket if it doesn't exist
    const appUpdatesExists = buckets.find(b => b.name === 'app-updates');
    if (!appUpdatesExists) {
      console.log('📁 جاري إنشاء حاوية "app-updates"...');
      const { error: createError } = await supabase.storage.createBucket('app-updates', {
        public: true,
        fileSizeLimit: 52428800 // 50MB for APKs
      });
      if (createError) throw createError;
      console.log('✅ تم إنشاء حاوية "app-updates" بنجاح.');
    } else {
      console.log('ℹ️ حاوية "app-updates" موجودة بالفعل.');
    }

    console.log('🚀 تم الانتهاء من إعداد مساحة التخزين.');
  } catch (err) {
    console.error('❌ فشل إعداد مساحة التخزين:', err.message);
  }
}

setupStorage();
