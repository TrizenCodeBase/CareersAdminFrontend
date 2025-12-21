import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Upload, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import * as XLSX from 'xlsx';

type UploadRow = {
  email: string;
};

const DEFAULT_EMAIL_BODY = `Hello,

We wanted to share an update with you. Please find the details below.

- Bullet point 1
- Bullet point 2
- Bullet point 3

Thanks,
Trizen Team`;

export default function BulkEmailUpload() {
  const { token, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [sending, setSending] = useState(false);
  const [sendSummary, setSendSummary] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  
  // Template and attachments
  const [emailSubject, setEmailSubject] = useState('Trizen Update');
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [headerLogo, setHeaderLogo] = useState<File | null>(null);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string>('');
  const [useHeaderLogoUrl, setUseHeaderLogoUrl] = useState<boolean>(false);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setSendSummary(null);
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: UploadRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const normalized = json
        .map((r) => ({
          email: (r.email || (r as any).Email || '').trim(),
        }))
        .filter((r) => r.email);

      if (normalized.length === 0) {
        setUploadError('No valid email addresses found in the file');
      } else {
        setRows(normalized);
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSendAll = async () => {
    if (!rows.length) return;
    setSendSummary(null);
    setSending(true);
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    // Convert user-uploaded attachments to base64
    let attachmentData: any[] = [];
    try {
      attachmentData = await Promise.all(
        attachments.map(async (file) => ({
          filename: file.name,
          content: (await fileToBase64(file)).split(',')[1], // Remove data:mime;base64, prefix
          contentType: file.type
        }))
      );
      
      // Add header logo - either as URL or base64 file
      if (useHeaderLogoUrl && headerLogoUrl.trim()) {
        // Use URL for header logo (best for Gmail compatibility)
        attachmentData.unshift({
          filename: 'header-logo.png', // Required for detection, but won't be used as attachment
          url: headerLogoUrl.trim(),
          contentType: 'image/jpeg' // Default, can be detected from URL
        });
      } else if (headerLogo) {
        // Use uploaded file (base64)
        attachmentData.unshift({
          filename: headerLogo.name,
          content: (await fileToBase64(headerLogo)).split(',')[1],
          contentType: headerLogo.type || 'image/png',
        });
      }
    } catch (err) {
      setUploadError('Failed to process attachments');
      setSending(false);
      return;
    }

    // Send custom email with template and attachments
    const sendOne = async (row: UploadRow) => {
      const endpoint = `${API_CONFIG.EMAIL_SERVICE.BASE_URL}/api/support/send-custom`;

      const body = {
        clientEmail: row.email,
        clientName: 'Student',
        subject: emailSubject,
        message: emailBody,
        isHtml: false,
        attachments: attachmentData
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_CONFIG.EMAIL_SERVICE.API_KEY,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        logout();
        navigate('/login');
        throw new Error('Session expired');
      }

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed with status ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
    };

    const tasks = rows.map((row) =>
      sendOne(row).then(
        () => {
          success += 1;
        },
        (err) => {
          failed += 1;
          errors.push(`${row.email}: ${err?.message || err}`);
        }
      )
    );

    await Promise.all(tasks);
    setSendSummary({ success, failed, errors });
    setSending(false);
  };

  const handleDownloadTemplate = () => {
    const sample = [
      { email: 'jane.doe@example.com' },
      { email: 'john.smith@example.com' },
      { email: 'candidate@example.com' },
    ];
    const sheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Emails');
    XLSX.writeFile(workbook, 'email-upload-template.xlsx');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Email Upload</h1>
        <p className="text-gray-600 mt-1">Create custom email campaigns with templates and attachments</p>
      </div>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Email Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <Input
              type="text"
              value={emailSubject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailSubject(e.target.value)}
              placeholder="Enter email subject line"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Header Logo (optional)
            </label>
            
            {/* Toggle between URL and file upload */}
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  setUseHeaderLogoUrl(false);
                  setHeaderLogoUrl('');
                }}
                className={`px-3 py-1 text-sm rounded-md border ${
                  !useHeaderLogoUrl
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseHeaderLogoUrl(true);
                  setHeaderLogo(null);
                }}
                className={`px-3 py-1 text-sm rounded-md border ${
                  useHeaderLogoUrl
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Use URL
              </button>
            </div>

            {useHeaderLogoUrl ? (
              <div className="space-y-2">
                <Input
                  type="url"
                  value={headerLogoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHeaderLogoUrl(e.target.value)}
                  placeholder="https://logo.llp.trizenventures.com/logo.jpg"
                  className="w-full"
                />
                {headerLogoUrl && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md border">
                    <img
                      src={headerLogoUrl}
                      alt="Header logo preview"
                      className="max-w-full h-auto max-h-32 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Enter the full URL to your header logo image. Recommended for Gmail compatibility.
                </p>
              </div>
            ) : (
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer hover:bg-gray-50">
                  <ImageIcon className="h-4 w-4" />
                  <span>{headerLogo ? headerLogo.name : 'Choose image file'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setHeaderLogo(e.target.files?.[0] || null)}
                  />
                </label>
                {headerLogo && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md border">
                    <img
                      src={URL.createObjectURL(headerLogo)}
                      alt="Header logo preview"
                      className="max-w-full h-auto max-h-32 object-contain"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Upload an image file. For best Gmail compatibility, use URL instead.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body (plain text)
            </label>
            <Textarea
              value={emailBody}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEmailBody(e.target.value)}
              placeholder="Write the email body in plain text"
              rows={12}
              className="w-full font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Plain text only. Add links as full URLs (e.g., https://example.com).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Images, PDFs, Documents)
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                <span>Choose files</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                  className="hidden"
                />
              </label>
              {attachments.length > 0 && (
                <div className="text-sm text-gray-600">
                  {attachments.length} file(s) selected: {attachments.map(f => f.name).join(', ')}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setEmailBody(DEFAULT_EMAIL_BODY);
                setEmailSubject('Trizen Update');
                setHeaderLogo(null);
                setHeaderLogoUrl('');
                setUseHeaderLogoUrl(false);
              }}
            >
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recipient List Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Required column: <span className="font-medium">email</span> only
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 hover:border-brand-primary transition-colors">
              <Upload className="h-5 w-5 text-gray-600" />
              <span className="text-gray-700">Choose file (.xlsx, .xls, .csv)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = ''; // Reset input
                }}
              />
            </label>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {uploadError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium">Error</p>
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="border rounded-md p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      File parsed successfully
                    </p>
                    <p className="text-sm text-gray-600">
                      {rows.length} email{rows.length !== 1 ? 's' : ''} ready to send
                    </p>
                  </div>
                  <Button
                    onClick={handleSendAll}
                    disabled={sending || uploading}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {sending
                      ? 'Sending...'
                      : `Send ${rows.length} email${rows.length !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <p className="text-sm font-medium text-gray-700">
                    Preview (showing first 10 of {rows.length})
                  </p>
                </div>
                <div className="divide-y">
                  {rows.slice(0, 10).map((r, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{r.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {sendSummary && (
            <div className="border rounded-md p-4 space-y-3">
              <p className="font-medium text-gray-900">Send Summary</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-md">
                  <p className="text-2xl font-bold text-green-600">{sendSummary.success}</p>
                  <p className="text-sm text-green-700">Successfully sent</p>
                </div>
                <div className="p-3 bg-red-50 rounded-md">
                  <p className="text-2xl font-bold text-red-600">{sendSummary.failed}</p>
                  <p className="text-sm text-red-700">Failed</p>
                </div>
              </div>
              {sendSummary.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700">
                    View error details ({sendSummary.errors.length} errors)
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-red-600 list-disc pl-5">
                    {sendSummary.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Customize your email:</strong> Set the subject line, add a plain-text body, and optionally attach a header logo image</li>
            <li><strong>Add attachments:</strong> Upload images, PDFs, or documents that will be sent with every email</li>
            <li><strong>Prepare recipient list:</strong> Download the template Excel file</li>
            <li><strong>Fill recipients:</strong> Add one email address per row in the <span className="font-medium">email</span> column</li>
            <li><strong>Upload:</strong> Upload the completed Excel file</li>
            <li><strong>Send:</strong> Review the recipient list and click "Send" to dispatch emails</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800">✨ Features:</p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc pl-5">
              <li>Custom HTML email templates</li>
              <li>File attachments (images, PDFs, documents)</li>
              <li>Live preview before sending</li>
              <li>Bulk sending to multiple recipients</li>
              <li>Default Trizen Academy branding template included</li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm font-medium text-yellow-800">⚠️ Important:</p>
            <p className="text-sm text-yellow-700 mt-1">
              All recipients will receive the same email with the same attachments. Make sure your content and recipient list are correct before sending.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

