import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';


const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://ylcccbcbznqvxogujeij.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsY2NjYmNiem5xdnhvZ3VqZWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMzgwMzYsImV4cCI6MjA5NzgxNDAzNn0.74by-scEL7TWH2PB58n8U7VizdHlrhUoNEL4zjErkWE';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
