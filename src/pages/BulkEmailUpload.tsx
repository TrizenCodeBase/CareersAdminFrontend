import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Upload, Download, Eye, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import * as XLSX from 'xlsx';

type UploadRow = {
  email: string;
};

const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #362c86; text-align: center; padding: 20px 0;">
              <img
                src="https://drive.google.com/uc?export=view&id=141p2D4bNG15jd3S9ja7EdFgBANngvcW4"
                alt="Trizen Logo"
                style="max-width: 400px; height: auto; max-height: 150px; display: block; margin: 0 auto;"
              />
            </td>
          </tr> 
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear Student,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your final year project is a key academic milestone and should demonstrate clear understanding, implementation, and research quality.
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                At <strong>Trizen Academy</strong>, we train B.Tech and M.Tech students to complete their final year projects end-to-end.
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #362c86; padding: 20px; margin: 0 0 25px 0; border-radius: 4px;">
                <h2 style="color: #362c86; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">
                  End-to-End Deliverables Include:
                </h2>
                <ol style="color: #333333; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Finalized industry-relevant problem statement</li>
                  <li>Complete working project code using updated technologies</li>
                  <li>System architecture, flowcharts, and diagrams</li>
                  <li>PPT, documentation, and final reports</li>
                  <li>Live demo preparation and explanation</li>
                  <li>Research paper drafting (IEEE/Scopus standards)</li>
                </ol>
              </div>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                <strong>Domains:</strong> CSE, AIML, AI, Blockchain, IoT, ECE, VLSI, Embedded Systems, and more.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #362c86; padding: 25px; text-align: center; color: #ffffff;">
              <p style="margin: 8px 0; font-size: 16px;">📞 <strong>8639648822, 8247422730</strong></p>
              <p style="margin: 8px 0; font-size: 16px;">🌐 <strong>academy.trizenventures.com</strong></p>
              <p style="margin: 8px 0; font-size: 14px;">📍 Visakhapatnam, Hyderabad</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export default function BulkEmailUpload() {
  const { token, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [sending, setSending] = useState(false);
  const [sendSummary, setSendSummary] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  
  // Template and attachments
  const [emailSubject, setEmailSubject] = useState('Final Year Project & Research Training – End-to-End Deliverables');
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showPreview, setShowPreview] = useState(false);

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
        message: emailTemplate,
        isHtml: true,
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

      {/* Email Template Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Email Template & Content
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
              placeholder="Enter email subject"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Template (HTML)
            </label>
            <Textarea
              value={emailTemplate}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEmailTemplate(e.target.value)}
              placeholder="Enter HTML email template"
              rows={12}
              className="w-full font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Customize the HTML template above. Default template includes Trizen branding.
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
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEmailTemplate(DEFAULT_EMAIL_TEMPLATE);
                setEmailSubject('Final Year Project & Research Training – End-to-End Deliverables');
              }}
            >
              Reset to Default
            </Button>
          </div>

          {showPreview && (
            <div className="border rounded-md p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-2">Email Preview:</p>
              <div 
                className="bg-white border rounded p-4 max-h-96 overflow-auto"
                dangerouslySetInnerHTML={{ __html: emailTemplate }}
              />
            </div>
          )}
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
            <li><strong>Customize your email:</strong> Edit the subject line and HTML template (or use the default Trizen Academy template)</li>
            <li><strong>Add attachments:</strong> Upload images, PDFs, or documents that will be sent with every email</li>
            <li><strong>Preview:</strong> Click "Show Preview" to see how your email will look</li>
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

