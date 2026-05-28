"use client";

import { createClient } from "@supabase/supabase-js";

// IMPORTANT: Replace with your actual Supabase project URL and anon key
const supabaseUrl = "https://supabase.com/dashboard/project/hgjdvmhzmeejivpkkoao/storage/files/buckets/tushar";
const supabaseAnonKey = "hgjdvmhzmeejivpkkoao";

if (!supabaseUrl || supabaseUrl === "https://supabase.com/dashboard/project/hgjdvmhzmeejivpkkoao/storage/files/buckets/tushar") {
    console.error("Supabase URL is not configured. Please add it to src/supabase/config.ts");
}
if (!supabaseAnonKey || supabaseAnonKey === "hgjdvmhzmeejivpkkoao") {
    console.error("Supabase anon key is not configured. Please add it to src/supabase/config.ts");
}

export const supabase = createClient("https://supabase.com/dashboard/project/hgjdvmhzmeejivpkkoao/storage/files/buckets/tushar", "hgjdvmhzmeejivpkkoao");
