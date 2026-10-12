import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'out/**', 'build/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Listing photos come from arbitrary seller URLs and Supabase Storage, so plain <img> is intentional.
  { rules: { '@next/next/no-img-element': 'off' } },
];
export default config;
