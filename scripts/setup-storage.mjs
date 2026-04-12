
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables for storage setup');
  process.exit(1);
}

async function setupStorage() {
  console.log('🛠️ جاري تهيئة مساحة التخزين (Supabase Storage) عبر API...');
  
  try {
    // 1. List buckets
    const listResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to list buckets: ${listResponse.status} ${await listResponse.text()}`);
    }

    const buckets = await listResponse.json();

    // 2. Ensure 'invoices' bucket exists
    const invoicesBucket = buckets.find(b => b.name === 'invoices');
    if (!invoicesBucket) {
      console.log('📁 جاري إنشاء حاوية "invoices"...');
      const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 'invoices',
          name: 'invoices',
          public: true,
          file_size_limit: 5242880,
          allowed_mime_types: ['image/jpeg', 'image/png']
        })
      });

      if (!createResponse.ok) {
        console.error('❌ Failed to create invoices bucket:', await createResponse.text());
      } else {
        console.log('✅ تم إنشاء حاوية "invoices" بنجاح.');
      }
    } else {
      console.log('ℹ️ حاوية "invoices" موجودة بالفعل.');
    }

    // 3. Ensure 'app-updates' bucket exists
    const appUpdatesBucket = buckets.find(b => b.name === 'app-updates');
    if (!appUpdatesBucket) {
      console.log('📁 جاري إنشاء حاوية "app-updates"...');
      const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 'app-updates',
          name: 'app-updates',
          public: true,
          file_size_limit: 52428800
        })
      });

      if (!createResponse.ok) {
        console.error('❌ Failed to create app-updates bucket:', await createResponse.text());
      } else {
        console.log('✅ تم إنشاء حاوية "app-updates" بنجاح.');
      }
    } else {
      console.log('ℹ️ حاوية "app-updates" موجودة بالفعل.');
    }

    console.log('🚀 تم الانتهاء من إعداد مساحة التخزين.');
  } catch (err) {
    console.error('❌ فشل إعداد مساحة التخزين:', err.message);
    process.exit(1);
  }
}

setupStorage();
