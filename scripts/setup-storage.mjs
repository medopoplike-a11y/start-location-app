
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdpjvorettivpdviytqo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcGp2b3JldHRpdnBkdml5dHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg4MjYwMiwiZXhwIjoyMDg5NDU4NjAyfQ.gXUmtkauzomPzB_jjkzwyPMUrfxI-ICBMBs4u1N6ONA';

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
      const { data, error: createError } = await supabase.storage.createBucket('invoices', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) throw createError;
      console.log('✅ تم إنشاء الحاوية بنجاح.');
    } else {
      console.log('ℹ️ حاوية "invoices" موجودة بالفعل.');
    }

    console.log('🚀 تم الانتهاء من إعداد مساحة التخزين.');
  } catch (err) {
    console.error('❌ فشل إعداد مساحة التخزين:', err.message);
  }
}

setupStorage();
