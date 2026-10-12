import { NextRequest, NextResponse } from 'next/server';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { env } from '@/lib/env';
import { createSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads one listing image to Supabase Storage and returns its public URL. */
export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const supabase = createSupabaseAdmin();
  if (!supabase) return jsonError('Image storage is not configured (SUPABASE_SERVICE_ROLE_KEY).', 503);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return jsonError('No file uploaded.');
  const ext = TYPES[file.type];
  if (!ext) return jsonError('Only JPEG, PNG or WebP images are allowed.');
  if (file.size > MAX_BYTES) return jsonError('Images must be 5 MB or smaller.');

  try {
    const bucket = env.SUPABASE_STORAGE_BUCKET;
    const { data: existing } = await supabase.storage.getBucket(bucket);
    if (!existing) await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Object.keys(TYPES) });

    const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path }, { status: 201 });
  } catch (error) {
    return serverError('Image upload failed', error);
  }
}
