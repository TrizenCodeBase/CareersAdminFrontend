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
  RotateCcw,
  Check,
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
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }
    const stored = localStorage.getItem("bulk-email-history");
    if (stored) {
      try {
        setEmailHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load email history:", e);
      }
    }
  }, [isAuthenticated, isAdmin, navigate]);

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
        attachmentData.unshift({
          filename: "header-logo.png",
          url: headerLogoUrl.trim(),
          contentType: "image/jpeg",
        });
      } else if (headerLogo) {
        attachmentData.unshift({
          filename: "header-logo.png",
          content: (await fileToBase64(headerLogo)).split(",")[1],
          contentType: headerLogo.type || "image/png",
        });
      }

      // Add URL-based attachments
      if (attachmentUrls.trim()) {
        const urls = attachmentUrls
          .split("\n")
          .map((url) => url.trim())
          .filter((url) => url.length > 0 && url.startsWith("http"));

        urls.forEach((url) => {
          const filename = url.split("/").pop() || "attachment";
          const ext = filename.split(".").pop()?.toLowerCase() || "";
          let contentType = "application/octet-stream";

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

    const sendOne = async (row: UploadRow) => {
      const endpoint = `${API_CONFIG.EMAIL_SERVICE.BASE_URL}/api/support/send-custom`;

      const messageBody = useHtmlTemplate
        ? generateHtmlEmailTemplate()
        : emailBody;

      const body = {
        clientEmail: row.email,
        clientName: "Student",
        subject: emailSubject,
        message: messageBody,
        isHtml: useHtmlTemplate,
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

  const getStepStatus = () => {
    if (sending) return 3;
    if (sendSummary) return 4;
    if (rows.length > 0) return 2;
    return 1;
  };

  const currentStep = getStepStatus();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary to-[#0077b6]" />
        <div className="px-6 py-6 sm:py-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-accent text-primary rounded-xl shrink-0">
              <Mail className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Bulk Email Campaign</h1>
              <p className="text-sm text-gray-500 mt-1">Design and send custom email campaigns with attachments.</p>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className={`flex items-center gap-3 ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-semibold text-sm">Compose</span>
            </div>
            <div className="hidden sm:block flex-1 h-[2px] bg-gray-100 mt-4 mx-4">
              <div className={`h-full bg-primary transition-all duration-500 ${currentStep >= 2 ? 'w-full' : 'w-0'}`} />
            </div>
            <div className={`flex items-center gap-3 ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                {currentStep > 2 ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-semibold text-sm">Upload List</span>
            </div>
            <div className="hidden sm:block flex-1 h-[2px] bg-gray-100 mt-4 mx-4">
               <div className={`h-full bg-primary transition-all duration-500 ${currentStep >= 3 ? 'w-full' : 'w-0'}`} />
            </div>
            <div className={`flex items-center gap-3 ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                {currentStep > 3 ? <Check className="w-5 h-5" /> : '3'}
              </div>
              <span className="font-semibold text-sm">Send</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Email Content */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex flex-row items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
              <CardTitle className="text-lg">Compose Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 transition-colors hover:border-primary/20">
                <Label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useHtmlTemplate}
                    onChange={(e) => {
                      setUseHtmlTemplate(e.target.checked);
                      if (e.target.checked) {
                        setEmailBody(generateHtmlEmailTemplate());
                        setEmailSubject("Trizen Academy - Academic Projects");
                      } else {
                        setEmailBody(generateEmailTemplate());
                        setEmailSubject("Trizen Update");
                      }
                    }}
                    className="w-4 h-4 accent-primary rounded border-gray-300"
                  />
                  <span className="font-medium text-gray-800">
                    Use Pre-built HTML Template (with WhatsApp CTA)
                  </span>
                </Label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Email Subject</label>
                <Input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject line"
                  className="bg-white focus-visible:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Header Logo (optional)
                </label>
                <div className="flex items-center mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUseHeaderLogoUrl(false);
                      setHeaderLogoUrl("");
                    }}
                    className={`px-4 py-2 text-sm font-medium border rounded-l-lg transition-colors ${!useHeaderLogoUrl
                      ? "bg-accent border-primary/20 text-primary z-10"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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
                    className={`px-4 py-2 text-sm font-medium border rounded-r-lg -ml-px transition-colors ${useHeaderLogoUrl
                      ? "bg-accent border-primary/20 text-primary z-10"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    Use URL
                  </button>
                </div>

                {useHeaderLogoUrl ? (
                  <div className="space-y-3">
                    <Input
                      type="url"
                      value={headerLogoUrl}
                      onChange={(e) => setHeaderLogoUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-white focus-visible:ring-primary/30"
                    />
                    {headerLogoUrl && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
                        <img
                          src={headerLogoUrl}
                          alt="Header logo preview"
                          className="max-h-24 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:bg-slate-50 hover:border-primary/40 transition-colors">
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {headerLogo ? headerLogo.name : "Choose an image file..."}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setHeaderLogo(e.target.files?.[0] || null)}
                      />
                    </label>
                    {headerLogo && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
                        <img
                          src={URL.createObjectURL(headerLogo)}
                          alt="Header logo preview"
                          className="max-h-24 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {useHtmlTemplate ? 'HTML Content' : 'Email Body (Plain Text)'}
                </label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Message body..."
                  rows={useHtmlTemplate ? 16 : 12}
                  className="w-full font-mono text-sm bg-white focus-visible:ring-primary/30 resize-y"
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Attachments
                </label>
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center gap-2 min-h-[100px] rounded-xl border-2 border-dashed border-gray-200 bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-primary/30 transition-colors">
                    <Upload className="h-6 w-6 text-primary/60" />
                    <span className="text-sm font-medium text-gray-700">Click to upload small files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                      className="hidden"
                    />
                  </label>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((f, i) => (
                        <div key={i} className="px-3 py-1.5 bg-accent/50 text-primary text-xs font-medium rounded-lg border border-primary/10">
                          {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Or paste URLs to externally hosted files (one per line)
                    </label>
                    <Textarea
                      value={attachmentUrls}
                      onChange={(e) => setAttachmentUrls(e.target.value)}
                      placeholder="https://..."
                      rows={2}
                      className="font-mono text-xs focus-visible:ring-primary/30 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="ghost" onClick={() => {
                  setEmailBody(DEFAULT_EMAIL_BODY);
                  setEmailSubject("Trizen Update");
                  setHeaderLogo(null);
                  setHeaderLogoUrl("");
                  setUseHeaderLogoUrl(false);
                }} className="text-gray-500 hover:text-gray-900 gap-2 font-medium">
                  <RotateCcw className="h-4 w-4" /> Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recipient List Upload */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</div>
                <CardTitle className="text-lg">Recipients List</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2 bg-white">
                <Download className="h-4 w-4" /> Template
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <label className="flex flex-col items-center justify-center gap-3 min-h-[140px] rounded-xl border-2 border-dashed border-primary/20 bg-accent/10 cursor-pointer hover:bg-accent/30 hover:border-primary/40 transition-colors">
                <div className="p-3 bg-white rounded-full shadow-sm">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-primary block">Upload Excel/CSV File</span>
                  <span className="text-xs font-medium text-gray-500 mt-1">Requires a column named 'email'</span>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
              </label>

              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium flex items-center gap-2">
                  <XCircle className="h-5 w-5 shrink-0" />
                  {uploadError}
                </div>
              )}

              {rows.length > 0 && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-bold text-green-900">List Processed Successfully</p>
                        <p className="text-sm text-green-700 mt-0.5">{rows.length} valid email addresses found</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Preview (First 10)
                    </div>
                    <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto bg-white">
                      {rows.slice(0, 10).map((r, idx) => (
                        <div key={idx} className="px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-slate-50">
                          <span className="w-5 text-gray-400 text-right text-xs">{idx + 1}.</span>
                          <span className="font-medium">{r.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <Button
                      onClick={handleSendAll}
                      disabled={sending || uploading}
                      className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-bold shadow-md gap-2 rounded-xl"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                      {sending ? "Sending Campaign..." : `Send to ${rows.length} Recipients`}
                    </Button>
                  </div>
                </div>
              )}
              
              {sendSummary && (
                <div className="p-6 bg-slate-50 rounded-xl border border-gray-200 space-y-4 animate-in slide-in-from-bottom-2">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" /> Campaign Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-green-100 shadow-sm text-center">
                      <p className="text-4xl font-black text-green-600">{sendSummary.success}</p>
                      <p className="text-sm font-semibold text-gray-600 mt-1">Delivered</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-red-100 shadow-sm text-center">
                      <p className="text-4xl font-black text-red-600">{sendSummary.failed}</p>
                      <p className="text-sm font-semibold text-gray-600 mt-1">Failed</p>
                    </div>
                  </div>
                  {sendSummary.errors.length > 0 && (
                    <details className="mt-2 text-sm text-red-700">
                      <summary className="font-medium cursor-pointer py-2">View Error Details</summary>
                      <ul className="pl-5 space-y-1 list-disc mt-2">
                        {sendSummary.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Instructions */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 bg-accent/20">
            <CardHeader className="pb-3 border-b border-primary/10">
              <CardTitle className="text-base text-primary">How to use</CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-sm text-gray-700">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">1</div>
                  <p>Write your subject and message body. Use the HTML template for better visual presentation.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">2</div>
                  <p>Upload any attachments or paste URLs for larger files.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">3</div>
                  <p>Upload an Excel/CSV file with a column named <code className="bg-white px-1.5 py-0.5 rounded text-primary font-bold border border-primary/20">email</code>.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">4</div>
                  <p>Review the processed list and hit send. Don't close the tab while sending!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email History */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-gray-100 px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-gray-500" /> Recent Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {emailHistory.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-sm text-gray-500 font-medium">No history yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {emailHistory.map((entry) => {
                    const successRate = entry.recipientCount > 0 ? (entry.successCount / entry.recipientCount) * 100 : 0;
                    return (
                      <div key={entry.id} className="p-5 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 pr-2">{entry.subject || "(No subject)"}</h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 shrink-0 whitespace-nowrap mt-1">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex justify-between text-xs font-medium mb-1">
                            <span className="text-gray-600">{entry.recipientCount} emails</span>
                            <span className="text-green-600">{Math.round(successRate)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${successRate}%` }} />
                          </div>
                        </div>

                        <details className="text-xs group">
                          <summary className="font-medium text-primary cursor-pointer hover:underline">View details</summary>
                          <div className="mt-3 space-y-3 bg-white p-3 rounded border border-gray-100 shadow-sm">
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">Recipients ({entry.recipients.length})</p>
                              <div className="max-h-32 overflow-y-auto text-gray-500 space-y-1">
                                {entry.recipients.map((em, i) => <div key={i}>{em}</div>)}
                              </div>
                            </div>
                            {entry.errors.length > 0 && (
                              <div>
                                <p className="font-semibold text-red-700 mb-1">Errors ({entry.errors.length})</p>
                                <div className="max-h-32 overflow-y-auto text-red-600 space-y-1">
                                  {entry.errors.map((err, i) => <div key={i}>{err}</div>)}
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
