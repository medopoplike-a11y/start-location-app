
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple script to update OTA version in Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_ROLE_KEY"; 

async function updateOTA() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing environment variables for OTA update.");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const { data, error } = await supabase
    .from('app_config')
    .update({ 
      latest_version: "14.2.4-NATIVE-STABLE-AUTH",
      update_message: "V14.2.4: إصلاح استقرار المصادقة ومنع حلقات إعادة التشغيل",
      updated_at: new Date().toISOString()
    })
    .eq('id', 1);

  if (error) {
    console.error("Error updating OTA:", error);
  } else {
    console.log("OTA Version updated successfully to 1.1.1-HYPER-BACKGROUND-RADICAL");
  }
}

// updateOTA();
