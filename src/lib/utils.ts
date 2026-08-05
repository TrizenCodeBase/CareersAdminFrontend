import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract object key from a resume URL (presigned or path). Returns e.g. "resumes/123-file.pdf" or null.
 * Local disk URLs under /uploads/resumes/ are left alone (returned as null).
 */
export function extractKeyFromResumeUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    const keyParam = u.searchParams.get('key');
    if (keyParam) return decodeURIComponent(keyParam);
    const path = u.pathname || '';
    // Local disk uploads are served from /uploads/resumes/ — not MinIO
    if (path.includes('/uploads/resumes/')) return null;
    const match = path.match(/\/resumes\/(.+)$/);
    if (match) return `resumes/${match[1]}`;
  } catch {
    if (url.includes('/uploads/resumes/')) return null;
    const i = url.indexOf('/resumes/');
    if (i !== -1) return url.substring(i + 1);
  }
  return null;
}

/**
 * Prefer backend proxy URL for resume download (avoids redirect/CORS with MinIO).
 */
export function getResumeDownloadUrl(resumeLink: string, resumeProxyBase: string): string {
  const key = extractKeyFromResumeUrl(resumeLink);
  if (key) return `${resumeProxyBase}?key=${encodeURIComponent(key)}`;
  return resumeLink;
}

/**
 * Resume URL for in-browser viewing (PDF opens in a new tab instead of downloading).
 */
export function getResumeViewUrl(resumeLink: string, resumeProxyBase: string): string {
  const key = extractKeyFromResumeUrl(resumeLink);
  if (key) {
    return `${resumeProxyBase}?key=${encodeURIComponent(key)}&disposition=inline`;
  }
  return resumeLink;
}

/**
 * Open a resume in a new browser tab for viewing.
 */
export function viewResume(resumeLink: string | undefined, resumeProxyBase: string): void {
  if (!resumeLink) return;
  const url = getResumeViewUrl(resumeLink, resumeProxyBase);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

/**
 * Download a resume. Tries backend proxy first, then the original MinIO/presigned URL.
 */
export async function downloadFile(
  url: string,
  defaultFilename: string = 'resume.pdf',
  fallbackUrl?: string
): Promise<void> {
  const filenameFromUrl = url.split('/').pop()?.split('?')[0] || defaultFilename;
  const filename =
    filenameFromUrl && /\.(pdf|doc|docx)$/i.test(filenameFromUrl)
      ? filenameFromUrl
      : defaultFilename;

  const tryFetch = async (target: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(target, { mode: 'cors', signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      triggerBlobDownload(blob, filename);
      return true;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    if (await tryFetch(url)) return;
  } catch (proxyErr) {
    console.warn('Resume proxy download failed, trying original link', proxyErr);
  }

  if (fallbackUrl && fallbackUrl !== url) {
    try {
      if (await tryFetch(fallbackUrl)) return;
    } catch (fallbackErr) {
      console.warn('Resume fallback fetch failed, opening in new tab', fallbackErr);
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
