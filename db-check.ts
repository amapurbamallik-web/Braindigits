import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(5);
  console.log('PROFILES DATA:', JSON.stringify(data, null, 2));
  if (error) {
    console.error('PROFILES ERROR:', error);
  }
}
check();
