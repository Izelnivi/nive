import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseActive = false;

export const setSupabaseActive = (active) => {
  supabaseActive = active;
};

export const isSupabaseConfigured = () => {
  return supabaseActive;
};

export const hasSupabaseKeys = () => {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'your_supabase_project_url' &&
    supabaseAnonKey !== 'your_supabase_anon_key' &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== ''
  );
};

export const supabase = hasSupabaseKeys()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
