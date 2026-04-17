
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple script to update OTA version in Supabase
const SUPABASE_URL = "https://sdpjvorettivpdviytqo.supabase.co";
const SUPABASE_KEY = "YOUR_SERVICE_ROLE_KEY"; // I need to find this or use anon key if RLS allows

async function updateOTA() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const { data, error } = await supabase
    .from('app_config')
    .update({ 
      latest_version: "1.1.1-HYPER-BACKGROUND-RADICAL",
      update_message: "تحديث جذري: دعم كامل للعمل في الخلفية وإصلاح الأرقام العربية",
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
