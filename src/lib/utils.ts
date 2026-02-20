import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract object key from a resume URL (presigned or path). Returns e.g. "resumes/123-file.pdf" or null.
 */
export function extractKeyFromResumeUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    const keyParam = u.searchParams.get('key');
    if (keyParam) return decodeURIComponent(keyParam);
    const path = u.pathname || '';
    const match = path.match(/\/resumes\/(.+)$/);
    if (match) return `resumes/${match[1]}`;
  } catch {
    const i = url.indexOf('/resumes/');
    if (i !== -1) return url.substring(i + 1);
  }
  return null;
}

/**
 * Prefer backend proxy URL for resume download (avoids redirect/CORS with MinIO). Pass API resume proxy base and resumeLink.
 */
export function getResumeDownloadUrl(resumeLink: string, resumeProxyBase: string): string {
  const key = extractKeyFromResumeUrl(resumeLink);
  if (key) return `${resumeProxyBase}?key=${encodeURIComponent(key)}`;
  return resumeLink;
}

/**
 * Download a file from a URL. Triggers a download instead of opening in a new tab.
 * Falls back to opening in a new tab if fetch fails (e.g. CORS).
 */
export function downloadFile(url: string, defaultFilename: string = 'resume.pdf'): void {
  try {
    const filenameFromUrl = url.split('/').pop()?.split('?')[0] || defaultFilename
    const filename = filenameFromUrl && /\.(pdf|doc|docx)$/i.test(filenameFromUrl) ? filenameFromUrl : defaultFilename

    fetch(url, { mode: 'cors' })
      .then((res) => {
        if (!res.ok) throw new Error('Fetch failed')
        return res.blob()
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
      .catch(() => {
        window.open(url, '_blank', 'noopener,noreferrer')
      })
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

