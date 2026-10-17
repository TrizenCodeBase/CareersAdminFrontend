import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { JOB_OPTIONS, getAllJobOptions, registerJobTitle, getJobTitle, getRoleFamilyLabel, isSameRoleFamily } from '@/config/jobs';
import { APPLICATION_STATUSES, formatStatusLabel } from '@/config/applicationStatus';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, X, Download, CheckCircle2, XCircle, Copy, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { downloadFile, getResumeDownloadUrl } from '@/lib/utils';
import { ResumePreviewDialog } from '@/components/ResumePreviewDialog';

function slugifyFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'emails';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Parse comma/space/newline-separated emails. Returns list when 2+ valid emails are present. */
function parseBulkEmails(input: string): string[] {
  const parts = input
    .split(/[,;\n\r\t ]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const emails = [...new Set(parts.filter((part) => EMAIL_RE.test(part)))];
  return emails.length >= 2 ? emails : [];
}

/** Get initials from a full name: first letter of first two words. */
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface AppliedRole {
  _id: string;
  jobId: string;
  status: string;
  createdAt?: string;
}

interface Application {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinProfile?: string;
  motivation?: string;
  expectedStipend?: string;
  jobId: string;
  status: string;
  createdAt: string;
  source?: string;
  githubPortfolio?: string;
  assignmentSent?: boolean;
  assignmentReceived?: boolean;
  interviewLinkSent?: boolean;
  interviewScheduledDate?: string | null;
  interviewStatus?: string;
  interviewRecordingLink?: string;
  adminRemarks?: string;
  portfolioUrl?: string;
  portfolioWorkSamples?: string;
  resumeLink?: string;
  educationStatus?: string;
  degreeDiscipline?: string;
  preferredStartDate?: string;
  currentQualification?: string;
  collegeUniversity?: string;
  workPreference?: string;
  roleCount?: number;
  appliedRoles?: AppliedRole[];
  otherRoles?: AppliedRole[];
  appliedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface EmailLookupResult {
  requested: string[];
  found: string[];
  missing: string[];
  notInList: string[];
  foundCount: number;
  missingCount: number;
  notInListCount: number;
  applicationCount: number;
}

export default function Applications() {
  const { token, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [jobIdFilter, setJobIdFilter] = useState(() => searchParams.get('jobId') || 'all');
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));
  const [totalPages, setTotalPages] = useState(1);
  const [totalApplications, setTotalApplications] = useState(0);
  const [exportingEmails, setExportingEmails] = useState(false);
  const [emailLookup, setEmailLookup] = useState<EmailLookupResult | null>(null);
  const [copiedKind, setCopiedKind] = useState<'found' | 'missing' | 'notInList' | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);
  const [resumePreview, setResumePreview] = useState<Application | null>(null);
  const [availableJobOptions, setAvailableJobOptions] = useState(getAllJobOptions);

  useEffect(() => {
    fetch(API_CONFIG.ENDPOINTS.JOBS)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          data.data.forEach((j: any) => registerJobTitle(j.id, j.title));
          setAvailableJobOptions(getAllJobOptions());
        }
      })
      .catch(() => {});
  }, []);

  const bulkEmails = useMemo(() => parseBulkEmails(debouncedSearch), [debouncedSearch]);
  const isBulkEmailMode = bulkEmails.length >= 2;
  const liveBulkEmails = useMemo(() => parseBulkEmails(search), [search]);
  const showBulkSearchUi = liveBulkEmails.length >= 2 || isBulkEmailMode;

  const listReturnState = useMemo(
    () => ({ fromList: searchParams.toString() }),
    [searchParams]
  );

  // Persist filters in the URL so navigating to detail and back keeps them
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (jobIdFilter !== 'all') params.set('jobId', jobIdFilter);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
    setFiltersReady(true);
  }, [debouncedSearch, statusFilter, jobIdFilter, page, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!filtersReady) return;
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    if (isBulkEmailMode) {
      lookupEmails(bulkEmails);
    } else {
      setEmailLookup(null);
      fetchApplications();
    }
  }, [filtersReady, isAuthenticated, isAdmin, navigate, page, statusFilter, jobIdFilter, debouncedSearch, isBulkEmailMode]);

  const buildFilterParams = (pageNum: number, limit: number) => {
    const params = new URLSearchParams({
      page: pageNum.toString(),
      limit: limit.toString(),
    });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (jobIdFilter !== 'all') params.set('jobId', jobIdFilter);
    if (debouncedSearch && !isBulkEmailMode) params.set('search', debouncedSearch);
    return params;
  };

  const handleAuthFailure = (status: number) => {
    if (status === 401) {
      logout();
      navigate('/login');
      return true;
    }
    return false;
  };

  const lookupEmails = async (emails: string[]) => {
    setLoading(true);
    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.APPLICATIONS_LOOKUP_EMAILS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(jobIdFilter !== 'all' && { jobId: jobIdFilter }),
        }),
      });

      if (handleAuthFailure(response.status)) return;

      if (!response.ok) {
        throw new Error(`Lookup failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setApplications(data.data || []);
        setEmailLookup(data.lookup || null);
        setTotalApplications(data.lookup?.applicationCount ?? data.data?.length ?? 0);
        setTotalPages(1);
        setPage(1);
      } else {
        setApplications([]);
        setEmailLookup(null);
        setTotalApplications(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error looking up emails:', error);
      setApplications([]);
      setEmailLookup(null);
      setTotalApplications(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = buildFilterParams(page, 20);
      const response = await fetch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (handleAuthFailure(response.status)) return;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', response.status, errorText);
        throw new Error(`Failed to fetch applications: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setApplications(data.data);
        setTotalPages(Math.max(1, Number(data.pagination?.totalPages) || 1));
        setTotalApplications(Number(data.pagination?.totalApplications) || data.data.length || 0);
      } else {
        setApplications([]);
        setTotalPages(1);
        setTotalApplications(0);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
      setTotalPages(1);
      setTotalApplications(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFilteredApplications = async (): Promise<Application[]> => {
    if (isBulkEmailMode && applications.length) {
      return applications;
    }

    const pageSize = 100;
    let currentPage = 1;
    let totalPagesForExport = 1;
    const all: Application[] = [];

    do {
      const params = buildFilterParams(currentPage, pageSize);
      const response = await fetch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (handleAuthFailure(response.status)) throw new Error('Unauthorized');
      if (!response.ok) throw new Error(`Failed to fetch applications for export: ${response.status}`);

      const data = await response.json();
      const batch: Application[] = data.success && Array.isArray(data.data) ? data.data : [];
      all.push(...batch);
      totalPagesForExport = data.pagination?.totalPages || 1;
      currentPage += 1;
    } while (currentPage <= totalPagesForExport);

    return all;
  };

  const exportEmails = async () => {
    setExportingEmails(true);
    try {
      const apps = await fetchAllFilteredApplications();
      const emails = [
        ...new Set(apps.map((app) => (app.email || '').trim().toLowerCase()).filter(Boolean)),
      ].sort();

      const roleTitle = jobIdFilter !== 'all' ? getJobTitle(jobIdFilter) : 'All Roles';
      const roleLine =
        jobIdFilter !== 'all' ? `${roleTitle} (${jobIdFilter})` : 'All Roles';

      const headerLines = [
        roleLine,
        statusFilter !== 'all' ? `Status: ${statusFilter}` : null,
        isBulkEmailMode ? `Bulk email validation (${bulkEmails.length} checked)` : null,
        !isBulkEmailMode && debouncedSearch ? `Search: ${debouncedSearch}` : null,
        `Total emails: ${emails.length}`,
        `Exported: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        '',
      ].filter((line) => line !== null) as string[];

      const content = `${headerLines.join('\n')}${emails.join('\n')}\n`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugifyFilename(roleTitle)}-emails.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting emails:', error);
      alert('Failed to export emails. Please try again.');
    } finally {
      setExportingEmails(false);
    }
  };

  const copyEmails = async (emails: string[], kind: 'found' | 'missing' | 'notInList') => {
    if (!emails.length) return;
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      setCopiedKind(kind);
      setTimeout(() => setCopiedKind(null), 2000);
    } catch {
      alert('Could not copy to clipboard');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setJobIdFilter('all');
    setEmailLookup(null);
    setPage(1);
  };

  const hasActiveFilters =
    jobIdFilter !== 'all' || statusFilter !== 'all' || Boolean(debouncedSearch);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
      pending: 'warning',
      reviewed: 'secondary',
      shortlisted: 'success',
      assignment_sent: 'default',
      assignment_received: 'default',
      interview_link_sent: 'default',
      interview_scheduled: 'success',
      accepted: 'success',
      rejected: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {formatStatusLabel(status)}
      </Badge>
    );
  };

  const handleSearchPaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (parseBulkEmails(pasted).length >= 2) {
      e.preventDefault();
      setSearch(pasted.trim());
    }
  };

  // Build page numbers for pagination display
  const getPageNumbers = () => {
    const delta = 2;
    const range: (number | '…')[] = [];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push('…');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('…');
    if (totalPages > 1) range.push(totalPages);

    return range;
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Brand accent top border */}
        <div className="h-[3px] bg-gradient-to-r from-[#03045E] via-[#0077b6] to-[#DAF5FB]" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[#03045E] tracking-tight">Applications</h1>
                {!loading && (
                  <span className="inline-flex items-center rounded-full bg-[#DAF5FB] px-2.5 py-0.5 text-xs font-semibold text-[#03045E] ring-1 ring-[#03045E]/10">
                    {totalApplications}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">View and manage all job applications</p>
            </div>
          </div>
          <Button
            onClick={exportEmails}
            disabled={exportingEmails || loading}
            className="w-full sm:w-auto gap-2 bg-[#03045E] hover:bg-[#03045E]/90 text-white shadow-sm"
          >
            {exportingEmails ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>
              {exportingEmails
                ? 'Exporting…'
                : jobIdFilter !== 'all'
                  ? `Export emails — ${getJobTitle(jobIdFilter)}`
                  : 'Export emails'}
            </span>
          </Button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {/* Search / Bulk Email Input */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              {showBulkSearchUi ? (
                <Textarea
                  placeholder="Paste comma-separated emails to validate against the database..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onPaste={handleSearchPaste}
                  className="min-h-[96px] pl-10 font-mono text-sm focus-visible:ring-[#03045E]/40 resize-none"
                />
              ) : (
                <Input
                  placeholder="Search name, email, location — or paste many emails to validate"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onPaste={handleSearchPaste}
                  className="pl-10 h-10 focus-visible:ring-[#03045E]/40"
                />
              )}
            </div>
            {showBulkSearchUi && (
              <p className="text-xs text-[#03045E]/70 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Bulk email check: <strong>{liveBulkEmails.length || bulkEmails.length}</strong> email
                {(liveBulkEmails.length || bulkEmails.length) !== 1 ? 's' : ''} detected. Results show who is
                in the DB and who is missing.
              </p>
            )}
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full lg:w-44 h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {APPLICATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select
            value={jobIdFilter}
            onValueChange={(value) => {
              setJobIdFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full lg:w-80 h-10">
              <SelectValue placeholder="Job Role" />
            </SelectTrigger>
            <SelectContent className="max-h-80 overflow-y-auto">
              <SelectItem value="all">All Roles</SelectItem>
              {availableJobOptions.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title} ({job.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full lg:w-auto h-10 gap-1.5 text-gray-600 hover:text-red-600 hover:border-red-300"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && !isBulkEmailMode && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active:</span>
            {jobIdFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DAF5FB] px-2.5 py-1 text-xs font-medium text-[#03045E] ring-1 ring-[#03045E]/10">
                Role: {getJobTitle(jobIdFilter)}
                <button
                  type="button"
                  onClick={() => { setJobIdFilter('all'); setPage(1); }}
                  className="ml-0.5 rounded-full hover:bg-[#03045E]/10 p-0.5 transition-colors"
                  aria-label="Remove role filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DAF5FB] px-2.5 py-1 text-xs font-medium text-[#03045E] ring-1 ring-[#03045E]/10">
                Status: {formatStatusLabel(statusFilter)}
                <button
                  type="button"
                  onClick={() => { setStatusFilter('all'); setPage(1); }}
                  className="ml-0.5 rounded-full hover:bg-[#03045E]/10 p-0.5 transition-colors"
                  aria-label="Remove status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DAF5FB] px-2.5 py-1 text-xs font-medium text-[#03045E] ring-1 ring-[#03045E]/10">
                Search: {debouncedSearch.length > 40 ? `${debouncedSearch.slice(0, 40)}…` : debouncedSearch}
                <button
                  type="button"
                  onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
                  className="ml-0.5 rounded-full hover:bg-[#03045E]/10 p-0.5 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Bulk Email Validation Panel ── */}
      {isBulkEmailMode && emailLookup && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#03045E] to-[#0077b6] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Email Validation Results</h2>
                <p className="text-sm text-white/70 mt-0.5">
                  Checked {emailLookup.requested.length} unique email
                  {emailLookup.requested.length !== 1 ? 's' : ''}
                  {jobIdFilter !== 'all' ? ` for ${getJobTitle(jobIdFilter)}` : ''}
                  {statusFilter !== 'all' ? ` · status ${statusFilter}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Found {emailLookup.foundCount}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-100 ring-1 ring-red-400/30">
                  <XCircle className="h-3.5 w-3.5" />
                  Missing {emailLookup.missingCount}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/30">
                  Not in list {emailLookup.notInListCount ?? emailLookup.notInList?.length ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {emailLookup.foundCount > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-sm font-semibold text-emerald-800">In your paste · found in database</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyEmails(emailLookup.found, 'found')}
                    className="border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100 gap-1.5 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedKind === 'found' ? 'Copied!' : 'Copy found'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {emailLookup.found.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-xs text-emerald-700 font-normal"
                    >
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {emailLookup.missingCount > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-sm font-semibold text-red-800">In your paste · not in database</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyEmails(emailLookup.missing, 'missing')}
                    className="border-red-300 bg-white text-red-700 hover:bg-red-100 gap-1.5 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedKind === 'missing' ? 'Copied!' : 'Copy missing'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {emailLookup.missing.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-xs text-red-700 font-normal"
                    >
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(emailLookup.notInList?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">In database · not in your pasted list</p>
                    <p className="text-xs text-amber-700/70">Other applicants matching current role/status filters</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyEmails(emailLookup.notInList || [], 'notInList')}
                    className="border-amber-300 bg-white text-amber-700 hover:bg-amber-100 gap-1.5 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedKind === 'notInList' ? 'Copied!' : 'Copy not in list'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {(emailLookup.notInList || []).map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-xs text-amber-900 font-normal"
                    >
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Count Display ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#03045E]" />
              <span>{isBulkEmailMode ? 'Validating emails…' : 'Loading applications…'}</span>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-700">
              {isBulkEmailMode
                ? (
                  <>
                    <span className="font-semibold text-[#03045E]">{applications.length}</span>
                    {' '}matching application{applications.length !== 1 ? 's' : ''}
                  </>
                )
                : (
                  <>
                    Showing{' '}
                    <span className="font-semibold text-[#03045E]">{applications.length}</span>
                    {' '}of{' '}
                    <span className="font-semibold text-[#03045E]">{totalApplications}</span>
                    {' '}application{totalApplications !== 1 ? 's' : ''}
                    {totalPages > 1 && (
                      <span className="text-gray-500 font-normal"> · Page {page} of {totalPages}</span>
                    )}
                  </>
                )}
            </p>
          )}
        </div>
      </div>

      {/* ── Applications Table ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2.5 rounded-full bg-white px-4 py-2 shadow-md border border-gray-100 text-sm text-gray-600 font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-[#03045E]" />
              {isBulkEmailMode ? 'Validating emails…' : 'Updating results…'}
            </div>
          </div>
        )}
        <Table>
          <TableHeader className="sticky top-0 z-[5]">
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-gray-500">Name</TableHead>
              <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wide text-gray-500">Email</TableHead>
              <TableHead className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</TableHead>
              <TableHead className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-gray-500">Resume</TableHead>
              <TableHead className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-gray-500">Job Role</TableHead>
              <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-gray-500">GitHub / Portfolio</TableHead>
              <TableHead className="min-w-[140px] text-xs font-semibold uppercase tracking-wide text-gray-500">Assignment</TableHead>
              <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-gray-500">Interview</TableHead>
              <TableHead className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-gray-500">Status</TableHead>
              <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-gray-500">Remarks</TableHead>
              <TableHead className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-gray-500">Applied Date</TableHead>
              <TableHead className="min-w-[100px] text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full bg-gray-100 p-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {isBulkEmailMode
                          ? 'No matches found'
                          : 'No applications found'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {isBulkEmailMode
                          ? 'None of these emails were found in the database'
                          : hasActiveFilters
                            ? 'Try adjusting or clearing the active filters'
                            : 'Applications will appear here once submitted'}
                      </p>
                    </div>
                    {hasActiveFilters && !isBulkEmailMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="mt-1 gap-1.5 text-gray-600 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app, index) => (
                <TableRow
                  key={app._id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement | null;
                    if (target?.closest('a, button, input, textarea, select, [role="button"]')) {
                      return;
                    }
                    navigate(`/applications/${app._id}?jobId=${encodeURIComponent(app.jobId)}`, {
                      state: { ...listReturnState, jobId: app.jobId }
                    });
                  }}
                  className={`cursor-pointer transition-colors hover:bg-[#DAF5FB]/30 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                  title="Click to view details"
                >
                  {/* Name with avatar */}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#03045E]/10 text-[#03045E] text-xs font-semibold flex items-center justify-center shrink-0 select-none">
                        {getInitials(app.fullName)}
                      </div>
                      <span className="truncate">{app.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a href={`mailto:${app.email}`} className="text-blue-600 hover:underline">
                      {app.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <a href={`tel:${app.phone}`} className="text-blue-600 hover:underline">
                      {app.phone}
                    </a>
                  </TableCell>
                  <TableCell>
                    {app.resumeLink ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResumePreview(app)}
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadFile(
                              getResumeDownloadUrl(app.resumeLink, API_CONFIG.ENDPOINTS.RESUME_PROXY),
                              `resume-${app._id}.pdf`,
                              app.resumeLink
                            )
                          }
                        >
                          <Download className="h-4 w-4 mr-1.5" />
                          Download
                        </Button>
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 min-w-[200px]">
                      <span className="font-medium">{getJobTitle(app.jobId)}</span>
                      <span className="text-xs text-gray-400">{app.jobId}</span>
                      {(app.roleCount || 1) > 1 && (
                        <div className="mt-1 space-y-1">
                          <Badge variant="secondary" className="w-fit">
                            Applied to {app.roleCount} roles
                          </Badge>
                          {(app.otherRoles || []).some((role) =>
                            isSameRoleFamily(role.jobId, app.jobId)
                          ) && (
                            <Badge
                              variant="outline"
                              className="w-fit border-amber-300 bg-amber-50 text-amber-900"
                            >
                              Applied to {getRoleFamilyLabel(app.jobId)} before
                            </Badge>
                          )}
                          <div className="flex flex-col gap-0.5">
                            {(app.otherRoles || [])
                              .slice(0, 4)
                              .map((role) => (
                                <Link
                                  key={role._id}
                                  to={`/applications/${role._id}`}
                                  state={listReturnState}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  {isSameRoleFamily(role.jobId, app.jobId) ? '↻ ' : '+ '}
                                  {getJobTitle(role.jobId)} ({formatStatusLabel(role.status)})
                                </Link>
                              ))}
                            {(app.otherRoles?.length || 0) > 4 && (
                              <span className="text-xs text-gray-500">
                                +{(app.otherRoles?.length || 0) - 4} more — open View
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {app.githubPortfolio || app.portfolioUrl || app.portfolioWorkSamples ? (
                      <a
                        href={app.githubPortfolio || app.portfolioUrl || app.portfolioWorkSamples}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block max-w-[160px]"
                        title={app.githubPortfolio || app.portfolioUrl || app.portfolioWorkSamples}
                      >
                        Open
                      </a>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className={app.assignmentSent ? 'text-emerald-700' : 'text-gray-400'}>
                        Sent: {app.assignmentSent ? 'Yes' : 'No'}
                      </span>
                      <span className={app.assignmentReceived ? 'text-emerald-700' : 'text-gray-400'}>
                        Received: {app.assignmentReceived ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className={app.interviewLinkSent ? 'text-emerald-700' : 'text-gray-400'}>
                        Link: {app.interviewLinkSent ? 'Sent' : 'No'}
                      </span>
                      <span>
                        {app.interviewScheduledDate
                          ? format(new Date(app.interviewScheduledDate), 'MMM d, yyyy h:mm a')
                          : 'No date'}
                      </span>
                      <span>{formatStatusLabel(app.interviewStatus || 'not_scheduled')}</span>
                      {app.interviewRecordingLink && (
                        <a
                          href={app.interviewRecordingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Recording
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    <span className="line-clamp-2 text-xs text-gray-600 max-w-[160px]" title={app.adminRemarks || ''}>
                      {app.adminRemarks?.trim() || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{format(new Date(app.createdAt), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Link
                      to={`/applications/${app._id}?jobId=${encodeURIComponent(app.jobId)}`}
                      state={{ ...listReturnState, jobId: app.jobId }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 hover:bg-[#03045E] hover:text-white hover:border-[#03045E] transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {!isBulkEmailMode && totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-3">
          <p className="text-sm text-gray-600">
            Page <span className="font-semibold text-[#03045E]">{page}</span> of{' '}
            <span className="font-semibold text-[#03045E]">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="h-8 px-3"
            >
              ← Prev
            </Button>

            {getPageNumbers().map((num, i) =>
              num === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-gray-400 text-sm select-none">…</span>
              ) : (
                <Button
                  key={num}
                  variant={num === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(num as number)}
                  disabled={loading}
                  className={`h-8 w-8 p-0 text-sm ${num === page ? 'bg-[#03045E] hover:bg-[#03045E]/90 text-white border-[#03045E]' : ''}`}
                >
                  {num}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="h-8 px-3"
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      <ResumePreviewDialog
        open={Boolean(resumePreview)}
        onOpenChange={(open) => !open && setResumePreview(null)}
        resumeLink={resumePreview?.resumeLink}
        candidateName={resumePreview?.fullName}
        applicationId={resumePreview?._id}
      />
    </div>
  );
}
