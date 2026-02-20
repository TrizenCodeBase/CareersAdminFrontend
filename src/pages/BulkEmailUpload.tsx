import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_CONFIG } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Upload,
  Download,
  FileText,
  Image as ImageIcon,
  History,
  Clock,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";

type UploadRow = {
  email: string;
};

type EmailHistory = {
  id: string;
  timestamp: string;
  subject: string;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  recipients: string[];
  errors: string[];
  isHtml: boolean;
};

const DEFAULT_EMAIL_BODY = `Hello,

We wanted to share an update with you. Please find the details below.

- Bullet point 1
- Bullet point 2
- Bullet point 3

Thanks,
Extrahand Team`;

export default function BulkEmailUpload() {
  const { token, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [sending, setSending] = useState(false);
  const [sendSummary, setSendSummary] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [recipientPagination, setRecipientPagination] = useState<Record<string, number>>({});
  const [errorPagination, setErrorPagination] = useState<Record<string, number>>({});

  const RECIPIENTS_PER_PAGE = 20;
  const ERRORS_PER_PAGE = 20;

  // Template and attachments
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
  const [useHtmlTemplate, setUseHtmlTemplate] = useState(false);

  // Generate email template with domain selection link
  const generateEmailTemplate = () => {
    const link = `https://academy.projects.trizenventures.com/projects`;

    return `Hi,

Get your FREE PDF with 20+ project ideas! 🚀

Select your domain and fill the form:
${link}

Start building your final year project today!

Best regards,
Trizen Academy`;
  };

  // Generate simple HTML email template with image and WhatsApp button
  const generateHtmlEmailTemplate = () => {
    const whatsappLink = `https://wa.me/918247422730`;
    return `
    <div style="text-align: center; padding: 0; font-family: Arial, sans-serif;">
      <!-- Image will be inserted here by email service as header logo -->
      <div style="text-align: center; padding: 30px 20px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #000000; margin: 0 0 20px 0; line-height: 1.6; font-weight: bold;">
          For paper drafting, project development, or complete project mentorship services, connect with us on WhatsApp. Get expert assistance at affordable pricing!
        </p>
        <a href="${whatsappLink}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; margin-top: 10px;">
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0 0 30 30" style="vertical-align: middle; margin-right: 8px; display: inline-block;">
            <path fill="currentColor" d="M 15 3 C 8.373 3 3 8.373 3 15 C 3 17.251208 3.6323415 19.350068 4.7109375 21.150391 L 3.1074219 27 L 9.0820312 25.431641 C 10.829354 26.425062 12.84649 27 15 27 C 21.627 27 27 21.627 27 15 C 27 8.373 21.627 3 15 3 z M 10.892578 9.4023438 C 11.087578 9.4023438 11.287937 9.4011562 11.460938 9.4101562 C 11.674938 9.4151563 11.907859 9.4308281 12.130859 9.9238281 C 12.395859 10.509828 12.972875 11.979906 13.046875 12.128906 C 13.120875 12.277906 13.173313 12.453437 13.070312 12.648438 C 12.972312 12.848437 12.921344 12.969484 12.777344 13.146484 C 12.628344 13.318484 12.465078 13.532109 12.330078 13.662109 C 12.181078 13.811109 12.027219 13.974484 12.199219 14.271484 C 12.371219 14.568484 12.968563 15.542125 13.851562 16.328125 C 14.986562 17.342125 15.944188 17.653734 16.242188 17.802734 C 16.540187 17.951734 16.712766 17.928516 16.884766 17.728516 C 17.061766 17.533516 17.628125 16.864406 17.828125 16.566406 C 18.023125 16.268406 18.222188 16.319969 18.492188 16.417969 C 18.766188 16.515969 20.227391 17.235766 20.525391 17.384766 C 20.823391 17.533766 21.01875 17.607516 21.09375 17.728516 C 21.17075 17.853516 21.170828 18.448578 20.923828 19.142578 C 20.676828 19.835578 19.463922 20.505734 18.919922 20.552734 C 18.370922 20.603734 17.858562 20.7995 15.351562 19.8125 C 12.327563 18.6215 10.420484 15.524219 10.271484 15.324219 C 10.122484 15.129219 9.0605469 13.713906 9.0605469 12.253906 C 9.0605469 10.788906 9.8286563 10.071437 10.097656 9.7734375 C 10.371656 9.4754375 10.692578 9.4023438 10.892578 9.4023438 z"></path>
          </svg>
          WhatsApp Chat
        </a>
      </div>
    </div>
    `.trim();
  };
  const [attachments, setAttachments] = useState<File[]>([]);
  const [headerLogo, setHeaderLogo] = useState<File | null>(null);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string>("");
  const [useHeaderLogoUrl, setUseHeaderLogoUrl] = useState<boolean>(false);

  // Attachment URLs (for large files hosted elsewhere)
  const [attachmentUrls, setAttachmentUrls] = useState<string>("");

  // Load email history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("bulk-email-history");
    if (stored) {
      try {
        setEmailHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load email history:", e);
      }
    }
  }, []);

  // Save email history to localStorage
  const saveEmailHistory = (history: EmailHistory) => {
    const updated = [history, ...emailHistory]; // Keep all history entries
    setEmailHistory(updated);
    localStorage.setItem("bulk-email-history", JSON.stringify(updated));
  };

  // Pagination helpers
  const getRecipientPage = (entryId: string) => recipientPagination[entryId] || 1;
  const setRecipientPage = (entryId: string, page: number) => {
    setRecipientPagination(prev => ({ ...prev, [entryId]: page }));
  };

  const getRecipientPageData = (entry: EmailHistory) => {
    const currentPage = getRecipientPage(entry.id);
    const startIndex = (currentPage - 1) * RECIPIENTS_PER_PAGE;
    const endIndex = startIndex + RECIPIENTS_PER_PAGE;
    const totalPages = Math.ceil(entry.recipients.length / RECIPIENTS_PER_PAGE);
    const paginatedRecipients = entry.recipients.slice(startIndex, endIndex);

    return {
      currentPage,
      totalPages,
      paginatedRecipients,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, entry.recipients.length),
    };
  };

  const getErrorPage = (entryId: string) => errorPagination[entryId] || 1;
  const setErrorPage = (entryId: string, page: number) => {
    setErrorPagination(prev => ({ ...prev, [entryId]: page }));
  };

  const getErrorPageData = (entry: EmailHistory) => {
    const currentPage = getErrorPage(entry.id);
    const startIndex = (currentPage - 1) * ERRORS_PER_PAGE;
    const endIndex = startIndex + ERRORS_PER_PAGE;
    const totalPages = Math.ceil(entry.errors.length / ERRORS_PER_PAGE);
    const paginatedErrors = entry.errors.slice(startIndex, endIndex);

    return {
      currentPage,
      totalPages,
      paginatedErrors,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, entry.errors.length),
    };
  };

  const handleFile = async (file: File) => {
    setUploadError(null);
    setSendSummary(null);
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: UploadRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const normalized = json
        .map((r) => ({
          email: (r.email || (r as any).Email || "").trim(),
        }))
        .filter((r) => r.email);

      if (normalized.length === 0) {
        setUploadError("No valid email addresses found in the file");
      } else {
        setRows(normalized);
      }
    } catch (err: any) {
      setUploadError(err?.message || "Failed to parse file");
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
      reader.onerror = (error) => reject(error);
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
          content: (await fileToBase64(file)).split(",")[1], // Remove data:mime;base64, prefix
          contentType: file.type,
        }))
      );

      // Add header logo - either as URL or base64 file
      if (useHeaderLogoUrl && headerLogoUrl.trim()) {
        // Use URL for header logo (best for Gmail compatibility)
        attachmentData.unshift({
          filename: "header-logo.png", // Required for detection, but won't be used as attachment
          url: headerLogoUrl.trim(),
          contentType: "image/jpeg", // Default, can be detected from URL
        });
      } else if (headerLogo) {
        // Use uploaded file (base64)
        attachmentData.unshift({
          filename: "header-logo.png", // Fixed: Always use this name for proper header detection
          content: (await fileToBase64(headerLogo)).split(",")[1],
          contentType: headerLogo.type || "image/png",
        });
      }

      // Add URL-based attachments (for large files)
      if (attachmentUrls.trim()) {
        const urls = attachmentUrls
          .split("\n")
          .map((url) => url.trim())
          .filter((url) => url.length > 0 && url.startsWith("http"));

        urls.forEach((url) => {
          const filename = url.split("/").pop() || "attachment";
          const ext = filename.split(".").pop()?.toLowerCase() || "";
          let contentType = "application/octet-stream";

          // Detect content type from extension
          if (["jpg", "jpeg"].includes(ext)) contentType = "image/jpeg";
          else if (ext === "png") contentType = "image/png";
          else if (ext === "gif") contentType = "image/gif";
          else if (ext === "pdf") contentType = "application/pdf";
          else if (["doc", "docx"].includes(ext))
            contentType = "application/msword";

          attachmentData.push({
            filename,
            url,
            contentType,
          });
        });
      }
    } catch (err) {
      setUploadError("Failed to process attachments");
      setSending(false);
      return;
    }

    // Send custom email with template and attachments
    const sendOne = async (row: UploadRow) => {
      const endpoint = `${API_CONFIG.EMAIL_SERVICE.BASE_URL}/api/support/send-custom`;

      // Use HTML template if enabled, otherwise use plain text
      const messageBody = useHtmlTemplate
        ? generateHtmlEmailTemplate()
        : emailBody;

      const body = {
        clientEmail: row.email,
        clientName: "Student",
        subject: emailSubject,
        message: messageBody,
        isHtml: useHtmlTemplate, // Enable HTML mode
        attachments: attachmentData,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_CONFIG.EMAIL_SERVICE.API_KEY,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Session expired");
      }

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed with status ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Unknown error");
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

    // Save to history
    const historyEntry: EmailHistory = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      subject: emailSubject,
      recipientCount: rows.length,
      successCount: success,
      failedCount: failed,
      recipients: rows.map(r => r.email),
      errors: errors,
      isHtml: useHtmlTemplate,
    };
    saveEmailHistory(historyEntry);

    setSending(false);
  };

  const handleDownloadTemplate = () => {
    const sample = [
      { email: "jane.doe@example.com" },
      { email: "john.smith@example.com" },
      { email: "candidate@example.com" },
    ];
    const sheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Emails");
    XLSX.writeFile(workbook, "email-upload-template.xlsx");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Email Upload</h1>
        <p className="text-gray-600 mt-1">
          Create custom email campaigns with templates and attachments
        </p>
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
          <div className="flex items-center gap-4 mb-4">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useHtmlTemplate}
                onChange={(e) => {
                  setUseHtmlTemplate(e.target.checked);
                  if (e.target.checked) {
                    // Auto-generate HTML template when enabled
                    setEmailBody(generateHtmlEmailTemplate());
                    setEmailSubject("Trizen Academy - Academic Projects");
                  } else {
                    // Reset to plain text template
                    setEmailBody(generateEmailTemplate());
                    setEmailSubject("Trizen Update");
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">
                Use Image Email Template with WhatsApp Link
              </span>
            </Label>
          </div>

          {useHtmlTemplate && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 font-bold mb-2">
                ✓ Image Email Template Enabled
              </p>
              <p className="text-xs text-blue-700">
                Upload an image as header logo - it will be displayed with a WhatsApp link below it.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <Input
              type="text"
              value={emailSubject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmailSubject(e.target.value)
              }
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
                  setHeaderLogoUrl("");
                }}
                className={`px-3 py-1 text-sm rounded-md border ${!useHeaderLogoUrl
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
                className={`px-3 py-1 text-sm rounded-md border ${useHeaderLogoUrl
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeaderLogoUrl(e.target.value)
                  }
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
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Enter the full URL to your header logo image. Recommended for
                  Gmail compatibility.
                </p>
              </div>
            ) : (
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer hover:bg-gray-50">
                  <ImageIcon className="h-4 w-4" />
                  <span>
                    {headerLogo ? headerLogo.name : "Choose image file"}
                  </span>
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
                  Upload an image file. For best Gmail compatibility, use URL
                  instead.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {useHtmlTemplate ? 'HTML Email Template (Preview)' : 'Email Body (plain text)'}
            </label>
            {useHtmlTemplate ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">
                  <strong className="text-blue-600">Simple Professional HTML Template:</strong> Clean, text-based email
                  with project information, deliverables list, and contact details. Includes a simple download button linking to
                  <strong className="ml-1">Domain Selection Page</strong>.
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Professional and straightforward design. You can customize the HTML below if needed.
                </p>
                <Textarea
                  value={emailBody}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEmailBody(e.target.value)
                  }
                  placeholder="HTML email template"
                  rows={20}
                  className="w-full font-mono text-sm"
                />
              </div>
            ) : (
              <Textarea
                value={emailBody}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEmailBody(e.target.value)
                }
                placeholder="Write the email body in plain text"
                rows={12}
                className="w-full font-mono text-sm"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              {useHtmlTemplate
                ? 'HTML template with download button. Customize as needed.'
                : 'Plain text only. Add links as full URLs (e.g., https://example.com).'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Images, PDFs, Documents)
            </label>

            {/* File Upload Option */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  <span>Upload Files (Small files only)</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) =>
                      setAttachments(Array.from(e.target.files || []))
                    }
                    className="hidden"
                  />
                </label>
                {attachments.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {attachments.length} file(s) selected:{" "}
                    {attachments.map((f) => f.name).join(", ")}
                  </div>
                )}
              </div>

              {/* URL Option for Large Files */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Or paste URLs to hosted files (Recommended for large files)
                </label>
                <Textarea
                  value={attachmentUrls}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAttachmentUrls(e.target.value)
                  }
                  placeholder={`Paste URLs, one per line:\nhttps://example.com/brochure.pdf\nhttps://example.com/syllabus.pdf`}
                  rows={3}
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  💡 For large files (&gt;5MB), upload to your server and paste
                  URLs here to avoid email size limits.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setEmailBody(DEFAULT_EMAIL_BODY);
                setEmailSubject("Trizen Update");
                setHeaderLogo(null);
                setHeaderLogoUrl("");
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
              <span className="text-gray-700">
                Choose file (.xlsx, .xls, .csv)
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = ""; // Reset input
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
                      {rows.length} email{rows.length !== 1 ? "s" : ""} ready to
                      send
                    </p>
                  </div>
                  <Button
                    onClick={handleSendAll}
                    disabled={sending || uploading}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {sending
                      ? "Sending..."
                      : `Send ${rows.length} email${rows.length !== 1 ? "s" : ""
                      }`}
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
                        <span className="font-medium text-gray-900">
                          {r.email}
                        </span>
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
                  <p className="text-2xl font-bold text-green-600">
                    {sendSummary.success}
                  </p>
                  <p className="text-sm text-green-700">Successfully sent</p>
                </div>
                <div className="p-3 bg-red-50 rounded-md">
                  <p className="text-2xl font-bold text-red-600">
                    {sendSummary.failed}
                  </p>
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

      {/* Email History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Email History
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Track all your sent email campaigns
          </p>
        </CardHeader>
        <CardContent>
          {emailHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No email history yet. Sent emails will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emailHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {entry.subject}
                        </h3>
                        {entry.isHtml && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                            HTML
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{entry.recipientCount} recipients</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-semibold">
                            {entry.successCount}
                          </span>
                        </div>
                        {entry.failedCount > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="font-semibold">
                              {entry.failedCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recipients List with Pagination */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      View all recipients ({entry.recipients.length})
                    </summary>
                    <div className="mt-2 p-4 bg-gray-50 rounded-md border">
                      {(() => {
                        const pageData = getRecipientPageData(entry);
                        return (
                          <>
                            {/* Recipients List */}
                            <div className="mb-3 space-y-1 max-h-96 overflow-y-auto">
                              {pageData.paginatedRecipients.map((email, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs text-gray-700 py-1.5 px-2 border-b border-gray-200 last:border-0 hover:bg-gray-100 rounded"
                                >
                                  <span className="font-medium text-gray-500 mr-2">
                                    {pageData.startIndex + idx}.
                                  </span>
                                  {email}
                                </div>
                              ))}
                            </div>

                            {/* Pagination Controls */}
                            {pageData.totalPages > 1 && (
                              <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                                <div className="text-xs text-gray-600">
                                  Showing {pageData.startIndex} - {pageData.endIndex} of {entry.recipients.length} recipients
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                      e.preventDefault();
                                      setRecipientPage(entry.id, pageData.currentPage - 1);
                                    }}
                                    disabled={pageData.currentPage === 1}
                                    className="h-7 px-3 text-xs"
                                  >
                                    Previous
                                  </Button>
                                  <div className="text-xs text-gray-600">
                                    Page {pageData.currentPage} of {pageData.totalPages}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                      e.preventDefault();
                                      setRecipientPage(entry.id, pageData.currentPage + 1);
                                    }}
                                    disabled={pageData.currentPage === pageData.totalPages}
                                    className="h-7 px-3 text-xs"
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}
                            {pageData.totalPages === 1 && (
                              <div className="text-xs text-gray-500 pt-2 border-t border-gray-300">
                                Showing all {entry.recipients.length} recipients
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </details>

                  {/* Errors with Pagination */}
                  {entry.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700">
                        View errors ({entry.errors.length})
                      </summary>
                      <div className="mt-2 p-4 bg-red-50 rounded-md border border-red-200">
                        {(() => {
                          const errorPageData = getErrorPageData(entry);
                          return (
                            <>
                              {/* Errors List */}
                              <div className="mb-3 space-y-1 max-h-96 overflow-y-auto">
                                <ul className="space-y-1 text-xs text-red-700">
                                  {errorPageData.paginatedErrors.map((error, idx) => (
                                    <li
                                      key={idx}
                                      className="py-1.5 px-2 border-b border-red-200 last:border-0 hover:bg-red-100 rounded"
                                    >
                                      <span className="font-medium text-red-500 mr-2">
                                        {errorPageData.startIndex + idx}.
                                      </span>
                                      {error}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Pagination Controls */}
                              {errorPageData.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-3 border-t border-red-300">
                                  <div className="text-xs text-red-600">
                                    Showing {errorPageData.startIndex} - {errorPageData.endIndex} of {entry.errors.length} errors
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                        e.preventDefault();
                                        setErrorPage(entry.id, errorPageData.currentPage - 1);
                                      }}
                                      disabled={errorPageData.currentPage === 1}
                                      className="h-7 px-3 text-xs border-red-300 text-red-700 hover:bg-red-100"
                                    >
                                      Previous
                                    </Button>
                                    <div className="text-xs text-red-600">
                                      Page {errorPageData.currentPage} of {errorPageData.totalPages}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                        e.preventDefault();
                                        setErrorPage(entry.id, errorPageData.currentPage + 1);
                                      }}
                                      disabled={errorPageData.currentPage === errorPageData.totalPages}
                                      className="h-7 px-3 text-xs border-red-300 text-red-700 hover:bg-red-100"
                                    >
                                      Next
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {errorPageData.totalPages === 1 && (
                                <div className="text-xs text-red-500 pt-2 border-t border-red-300">
                                  Showing all {entry.errors.length} errors
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </details>
                  )}
                </div>
              ))}
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
            <li>
              <strong>Customize your email:</strong> Set the subject line, add a
              plain-text body, and optionally attach a header logo image
            </li>
            <li>
              <strong>Add attachments:</strong> Upload images, PDFs, or
              documents that will be sent with every email
            </li>
            <li>
              <strong>Prepare recipient list:</strong> Download the template
              Excel file
            </li>
            <li>
              <strong>Fill recipients:</strong> Add one email address per row in
              the <span className="font-medium">email</span> column
            </li>
            <li>
              <strong>Upload:</strong> Upload the completed Excel file
            </li>
            <li>
              <strong>Send:</strong> Review the recipient list and click "Send"
              to dispatch emails
            </li>
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
              All recipients will receive the same email with the same
              attachments. Make sure your content and recipient list are correct
              before sending.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
