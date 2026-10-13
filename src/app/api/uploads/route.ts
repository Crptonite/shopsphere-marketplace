import { NextRequest, NextResponse } from 'next/server';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { env } from '@/lib/env';
import { FILE_TYPES } from '@/lib/files';
import { createSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ALL_MIME_TYPES = Object.values(FILE_TYPES).map((t) => t.mime);
const BUCKET_LIMIT = 10 * 1024 * 1024;

/** Uploads one listing photo or document (PNG, JPG, WebP, PDF, DOCX, TXT, CSV) to Supabase Storage and returns its public URL. */
export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const supabase = createSupabaseAdmin();
  if (!supabase) return jsonError('File storage is not configured (SUPABASE_SERVICE_ROLE_KEY).', 503);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return jsonError('No file uploaded.');
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const type = FILE_TYPES[ext];
  if (!type) return jsonError('Only PNG, JPG, WebP images or PDF, DOCX, TXT, CSV documents are allowed.');
  if (file.size > type.maxBytes) return jsonError(`${type.kind === 'image' ? 'Photos' : 'Documents'} must be ${type.maxBytes / (1024 * 1024)} MB or smaller.`);

  try {
    const bucket = env.SUPABASE_STORAGE_BUCKET;
    const { data: existing } = await supabase.storage.getBucket(bucket);
    if (!existing) await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: BUCKET_LIMIT, allowedMimeTypes: ALL_MIME_TYPES });

    const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
    const body = Buffer.from(await file.arrayBuffer());
    let { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: type.mime, upsert: false });
    if (error) {
      // Buckets created before documents were allowed need their MIME list widened, then one retry.
      await supabase.storage.updateBucket(bucket, { public: true, fileSizeLimit: BUCKET_LIMIT, allowedMimeTypes: ALL_MIME_TYPES });
      ({ error } = await supabase.storage.from(bucket).upload(path, body, { contentType: type.mime, upsert: false }));
    }
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path, kind: type.kind, name: file.name }, { status: 201 });
  } catch (error) {
    return serverError('Upload failed', error);
  }
}
