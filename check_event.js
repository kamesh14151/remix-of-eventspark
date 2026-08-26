const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function checkEvent() {
  console.log("--- Admin Query ---");
  const { data: adminData, error: adminErr } = await supabaseAdmin
    .from('events')
    .select('id, name, slug, status')
    .eq('slug', 'ai-n6ofz3');
  console.log("Admin Data:", adminData, "Error:", adminErr);

  console.log("--- Anon Query ---");
  const { data: anonData, error: anonErr } = await supabaseAnon
    .from('events')
    .select('id, name, slug, status')
    .eq('slug', 'ai-n6ofz3')
    .eq('status', 'live');
  console.log("Anon Data:", anonData, "Error:", anonErr);
}

checkEvent();
