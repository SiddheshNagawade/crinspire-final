import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tpxlgozyviimneaednyz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGxnb3p5dmlpbW5lYWVkbnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNDgwOTcsImV4cCI6MjA4MDkyNDA5N30.l0LzZkirUC7Wtku-pa-8ZlsDAkLkjrzLC287VCc3gN0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);