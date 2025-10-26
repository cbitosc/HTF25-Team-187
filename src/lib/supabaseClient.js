import { createClient } from "@supabase/supabase-js";

console.log("ENV URL:", import.meta.env.VITE_SUPABASE_URL);
console.log(
  "ENV KEY:",
  import.meta.env.VITE_SUPABASE_ANON_KEY ? "Loaded" : "Missing"
);

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

window.supabase = supabase; // expose globally
export { supabase };
