import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase configuration to avoid env import issues
const SUPABASE_URL = 'https://prpvrnxtpvilxakxzajm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZybnh0cHZpbHhha3h6YWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDI3OTMsImV4cCI6MjA2NDExODc5M30.Yy-sEHdASoSnjjoi0DjeICSvnWj0g5svYS5Crok8J8k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase; 