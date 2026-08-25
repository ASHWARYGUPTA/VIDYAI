require('dotenv').config({ path: '/home/ash/Coding/VIDYAI/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkConnection() {
  console.log("Hitting remote Supabase URL:", process.env.SUPABASE_URL);
  
  // Try signing in as demo user
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@vidyai.in',
    password: 'demo1234',
  });
  
  if (error) {
    console.error("Supabase Error:", error.message);
  } else if (data.session) {
    console.log("Successfully connected! Data is arriving from the remote server.");
    console.log("User ID:", data.user.id);
  } else {
    console.log("No data returned, but no error thrown.");
  }
}

checkConnection();
