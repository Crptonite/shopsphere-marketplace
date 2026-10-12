import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/ai';
import { features } from '@/lib/env';

export const runtime = 'nodejs';

/** Turns "iphone 17 pro under 1500 tampines" into structured filters (Groq), or returns the raw keywords. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 200);
  const filters = await parseQuery(q);
  return NextResponse.json({ filters, ai: features.groq });
}
