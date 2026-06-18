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
    supabaseUrl !== 'https://bsfeetmcymmijhgwnyzq.supabase.co' &&
    supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZmVldG1jeW1taWpoZ3dueXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NzUwMTYsImV4cCI6MjA5NzE1MTAxNn0.ztxR_BAWgfZkNJIgKWmTa5zAxjLXt8hT8gcfzj1Wdsc' &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== ''
  );
};

export const supabase = hasSupabaseKeys()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
