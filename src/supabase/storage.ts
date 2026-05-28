"use client";

import { supabase } from "./config";

export const uploadFile = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from('images') // Assumes a bucket named 'images'
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('images')
    .getPublicUrl(data.path);

  if (!publicUrlData) {
    throw new Error('Could not get public URL for uploaded file.');
  }
  
  return publicUrlData.publicUrl;
};
