"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
    console.error("Supabase URL is not configured. Please add NEXT_PUBLIC_SUPABASE_URL to your environment variables.");
}
if (!supabaseAnonKey) {
    console.error("Supabase anon key is not configured. Please add NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
