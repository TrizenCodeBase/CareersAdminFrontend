import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { JOB_OPTIONS, getJobTitle } from '@/config/jobs';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, X, Download, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { downloadFile, getResumeDownloadUrl } from '@/lib/utils';

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
  portfolioUrl?: string;
  portfolioWorkSamples?: string;
  resumeLink?: string;
  educationStatus?: string;
  degreeDiscipline?: string;
  preferredStartDate?: string;
  currentQualification?: string;
  collegeUniversity?: string;
  workPreference?: string;
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
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobIdFilter, setJobIdFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApplications, setTotalApplications] = useState(0);
  const [exportingEmails, setExportingEmails] = useState(false);
  const [emailLookup, setEmailLookup] = useState<EmailLookupResult | null>(null);
  const [copiedKind, setCopiedKind] = useState<'found' | 'missing' | 'notInList' | null>(null);

  const bulkEmails = useMemo(() => parseBulkEmails(debouncedSearch), [debouncedSearch]);
  const isBulkEmailMode = bulkEmails.length >= 2;
  const liveBulkEmails = useMemo(() => parseBulkEmails(search), [search]);
  const showBulkSearchUi = liveBulkEmails.length >= 2 || isBulkEmailMode;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
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
  }, [isAuthenticated, isAdmin, navigate, page, statusFilter, jobIdFilter, debouncedSearch, isBulkEmailMode]);

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
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalApplications(data.pagination?.totalApplications ?? data.data.length);
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
      accepted: 'success',
      rejected: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">View and manage all job applications</p>
        </div>
        <Button
          onClick={exportEmails}
          disabled={exportingEmails || loading}
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {exportingEmails
            ? 'Exporting...'
            : jobIdFilter !== 'all'
              ? `Export emails — ${getJobTitle(jobIdFilter)}`
              : 'Export emails'}
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            {showBulkSearchUi ? (
              <Textarea
                placeholder="Paste comma-separated emails to validate against the database..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPaste={handleSearchPaste}
                className="min-h-[96px] pl-10 font-mono text-sm"
              />
            ) : (
              <Input
                placeholder="Search name, email, location — or paste many emails to validate"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPaste={handleSearchPaste}
                className="pl-10"
              />
            )}
          </div>
          {showBulkSearchUi && (
            <p className="text-xs text-gray-500">
              Bulk email check: {liveBulkEmails.length || bulkEmails.length} email
              {(liveBulkEmails.length || bulkEmails.length) !== 1 ? 's' : ''} detected. Results show who is
              in the DB and who is missing.
            </p>
          )}
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={jobIdFilter}
          onValueChange={(value) => {
            setJobIdFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full lg:w-80">
            <SelectValue placeholder="Job Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {JOB_OPTIONS.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title} ({job.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="w-full lg:w-auto">
            Clear filters
          </Button>
        )}
      </div>

      {isBulkEmailMode && emailLookup && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Email validation</h2>
              <p className="text-sm text-gray-600">
                Checked {emailLookup.requested.length} unique email
                {emailLookup.requested.length !== 1 ? 's' : ''}
                {jobIdFilter !== 'all' ? ` for ${getJobTitle(jobIdFilter)}` : ''}
                {statusFilter !== 'all' ? ` · status ${statusFilter}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Found {emailLookup.foundCount}
              </Badge>
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Missing {emailLookup.missingCount}
              </Badge>
              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                Not in paste {emailLookup.notInListCount ?? emailLookup.notInList?.length ?? 0}
              </Badge>
            </div>
          </div>

          {emailLookup.foundCount > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-green-700">In your paste · found in database</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyEmails(emailLookup.found, 'found')}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {copiedKind === 'found' ? 'Copied' : 'Copy found'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                {emailLookup.found.map((email) => (
                  <Badge
                    key={email}
                    variant="outline"
                    className="border-green-200 text-green-700 font-normal"
                  >
                    {email}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {emailLookup.missingCount > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-red-700">In your paste · not in database</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyEmails(emailLookup.missing, 'missing')}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {copiedKind === 'missing' ? 'Copied' : 'Copy missing'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {emailLookup.missing.map((email) => (
                  <Badge key={email} variant="outline" className="border-red-200 text-red-700 font-normal">
                    {email}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(emailLookup.notInList?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium text-amber-800">In database · not in your pasted list</p>
                  <p className="text-xs text-gray-500">
                    Other applicants matching current role/status filters
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyEmails(emailLookup.notInList || [], 'notInList')}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {copiedKind === 'notInList' ? 'Copied' : 'Copy not in list'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {(emailLookup.notInList || []).map((email) => (
                  <Badge
                    key={email}
                    variant="outline"
                    className="border-amber-200 text-amber-900 font-normal"
                  >
                    {email}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasActiveFilters && !isBulkEmailMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 font-medium">Active filters:</span>
          {jobIdFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Role: {getJobTitle(jobIdFilter)}
              <button
                type="button"
                onClick={() => {
                  setJobIdFilter('all');
                  setPage(1);
                }}
                className="ml-1 hover:text-red-600 transition-colors"
                aria-label="Remove role filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setPage(1);
                }}
                className="ml-1 hover:text-red-600 transition-colors"
                aria-label="Remove status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {debouncedSearch && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {debouncedSearch.length > 40 ? `${debouncedSearch.slice(0, 40)}…` : debouncedSearch}
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="ml-1 hover:text-red-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div className="text-sm text-gray-600">
        {loading
          ? isBulkEmailMode
            ? 'Validating emails...'
            : 'Loading applications...'
          : isBulkEmailMode
            ? `Showing ${applications.length} matching application${applications.length !== 1 ? 's' : ''}`
            : `Showing ${applications.length} of ${totalApplications} application${totalApplications !== 1 ? 's' : ''}${
                totalPages > 1 ? ` (Page ${page} of ${totalPages})` : ''
              }`}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center text-sm text-gray-500">
            {isBulkEmailMode ? 'Validating emails...' : 'Updating results...'}
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              <TableHead className="min-w-[120px]">Phone</TableHead>
              <TableHead className="min-w-[150px]">Location</TableHead>
              <TableHead className="min-w-[180px]">Job Role</TableHead>
              <TableHead className="min-w-[120px]">Expected Stipend</TableHead>
              <TableHead className="min-w-[150px]">Education</TableHead>
              <TableHead className="min-w-[120px]">Preferred Start</TableHead>
              <TableHead className="min-w-[200px]">LinkedIn</TableHead>
              <TableHead className="min-w-[150px]">Portfolio/Resume</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Applied Date</TableHead>
              <TableHead className="min-w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                  {isBulkEmailMode
                    ? 'None of these emails were found in the database'
                    : `No applications found${hasActiveFilters ? ' for the selected filters' : ''}`}
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app._id}>
                  <TableCell className="font-medium">{app.fullName}</TableCell>
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
                  <TableCell>{app.location}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{getJobTitle(app.jobId)}</span>
                      <span className="text-xs text-gray-400">{app.jobId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{app.expectedStipend || 'N/A'}</TableCell>
                  <TableCell>
                    {app.educationStatus || app.currentQualification || 'N/A'}
                    {app.degreeDiscipline && ` - ${app.degreeDiscipline}`}
                    {app.collegeUniversity && ` (${app.collegeUniversity})`}
                  </TableCell>
                  <TableCell>{app.preferredStartDate || 'N/A'}</TableCell>
                  <TableCell>
                    {app.linkedinProfile ? (
                      <a
                        href={app.linkedinProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block max-w-[200px]"
                        title={app.linkedinProfile}
                      >
                        View Profile
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {app.portfolioUrl || app.portfolioWorkSamples ? (
                      <a
                        href={app.portfolioUrl || app.portfolioWorkSamples}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block max-w-[150px]"
                        title={app.portfolioUrl || app.portfolioWorkSamples}
                      >
                        Portfolio
                      </a>
                    ) : (
                      'N/A'
                    )}
                    {app.resumeLink && (
                      <>
                        {' | '}
                        <button
                          type="button"
                          onClick={() =>
                            downloadFile(
                              getResumeDownloadUrl(app.resumeLink!, API_CONFIG.ENDPOINTS.RESUME_PROXY),
                              `resume-${app._id}.pdf`,
                              app.resumeLink
                            )
                          }
                          className="text-blue-600 hover:underline bg-transparent border-0 p-0 cursor-pointer font-inherit"
                        >
                          Resume
                        </button>
                      </>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>{format(new Date(app.createdAt), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Link to={`/applications/${app._id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isBulkEmailMode && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
