import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Download a file from a URL (e.g. presigned resume link). Triggers a download instead of opening in a new tab.
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

