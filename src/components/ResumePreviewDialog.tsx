import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, ExternalLink, Loader2, X } from 'lucide-react';
import { API_CONFIG } from '@/config/api';
import { Button } from '@/components/ui/button';
import { downloadFile, getResumeDownloadUrl, getResumeViewUrl } from '@/lib/utils';

interface ResumePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeLink?: string;
  candidateName?: string;
  applicationId?: string;
}

export function ResumePreviewDialog({
  open,
  onOpenChange,
  resumeLink,
  candidateName,
  applicationId,
}: ResumePreviewDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !resumeLink) return;

    let cancelled = false;
    let createdUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);

      const viewUrl = getResumeViewUrl(resumeLink, API_CONFIG.ENDPOINTS.RESUME_PROXY);
      const candidates = viewUrl === resumeLink ? [viewUrl] : [viewUrl, resumeLink];

      for (const target of candidates) {
        try {
          const res = await fetch(target, { mode: 'cors' });
          if (!res.ok) continue;
          const blob = await res.blob();
          if (cancelled) return;
          createdUrl = URL.createObjectURL(blob);
          setObjectUrl(createdUrl);
          setFileType(blob.type);
          setLoading(false);
          return;
        } catch {
          // try the next source
        }
      }

      if (!cancelled) {
        setLoading(false);
        setError('Could not load the resume for preview. Use "Open in new tab" or download it instead.');
      }
    };

    load();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setObjectUrl(null);
      setFileType('');
    };
  }, [open, resumeLink]);

  const isPdf = fileType.includes('pdf');

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex h-[90vh] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-base font-semibold text-brand-primary">
                Resume{candidateName ? ` — ${candidateName}` : ''}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-slate-500">
                Preview without leaving the dashboard
              </DialogPrimitive.Description>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {resumeLink && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        getResumeViewUrl(resumeLink, API_CONFIG.ENDPOINTS.RESUME_PROXY),
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Open in new tab
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadFile(
                        getResumeDownloadUrl(resumeLink, API_CONFIG.ENDPOINTS.RESUME_PROXY),
                        `resume-${applicationId || 'candidate'}.pdf`,
                        resumeLink
                      )
                    }
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </Button>
                </>
              )}
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="sm" aria-label="Close resume preview">
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="flex-1 bg-slate-100">
            {loading && (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading resume…
              </div>
            )}

            {!loading && error && (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">
                {error}
              </div>
            )}

            {!loading && !error && objectUrl && (
              isPdf ? (
                <iframe
                  src={objectUrl}
                  title="Resume preview"
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-600">
                  <p>
                    This resume is a Word document, which browsers cannot display inline.
                    Download it or open it in a new tab to read it.
                  </p>
                </div>
              )
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
