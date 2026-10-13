/** Listing attachments: photos and documents. Shared by the upload API, the listing form and the product pages. */
const MB = 1024 * 1024;

export const MAX_ATTACHMENTS = 4;
export const ATTACHMENT_ACCEPT = '.png,.webp,.jpg,.jpeg,.pdf,.docx,.txt,.csv';

export const FILE_TYPES: Record<string, { mime: string; kind: 'image' | 'document'; maxBytes: number }> = {
  png: { mime: 'image/png', kind: 'image', maxBytes: 5 * MB },
  jpg: { mime: 'image/jpeg', kind: 'image', maxBytes: 5 * MB },
  jpeg: { mime: 'image/jpeg', kind: 'image', maxBytes: 5 * MB },
  webp: { mime: 'image/webp', kind: 'image', maxBytes: 5 * MB },
  pdf: { mime: 'application/pdf', kind: 'document', maxBytes: 10 * MB },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'document', maxBytes: 10 * MB },
  txt: { mime: 'text/plain', kind: 'document', maxBytes: 10 * MB },
  csv: { mime: 'text/csv', kind: 'document', maxBytes: 10 * MB },
};

const DOCUMENT_EXTENSIONS = Object.keys(FILE_TYPES).filter((ext) => FILE_TYPES[ext].kind === 'document');

/** File extension of a URL or file name, lowercase, without the query string. */
export function urlExtension(url: string): string {
  const path = url.split(/[?#]/)[0];
  const match = path.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

export const isDocumentUrl = (url: string) => DOCUMENT_EXTENSIONS.includes(urlExtension(url));
export const isImageUrl = (url: string) => !isDocumentUrl(url);

/** First photo in an attachment list, falling back to the stored cover image. */
export function coverImage(attachments: string[] | undefined, fallback?: string | null): string {
  return attachments?.find(isImageUrl) || fallback || '';
}
