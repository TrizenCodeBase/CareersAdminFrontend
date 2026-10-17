import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { getJobTitle, getRoleFamilyLabel, isSameRoleFamily } from '@/config/jobs';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_STYLES,
  INTERVIEW_STATUSES,
  SOURCE_OPTIONS,
  formatStatusLabel,
} from '@/config/applicationStatus';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Calendar,
  Briefcase,
  FileText,
  Video,
  Download,
  Eye,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { downloadFile, getResumeDownloadUrl, cn } from '@/lib/utils';
import { ResumePreviewDialog } from '@/components/ResumePreviewDialog';

function toDatetimeLocal(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
interface AdminRecording {
  _id?: string;
  url: string;
  label?: string;
  note?: string;
  createdAt?: string;
}

interface RelatedApplication {
  _id: string;
  jobId: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  fullName?: string;
  email?: string;
  hasRemarks?: boolean;
  recordingsCount?: number;
}

interface Application {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinProfile: string;
  motivation: string;
  expectedStipend: string;
  jobId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  adminRemarks?: string;
  adminRecordings?: AdminRecording[];
  source?: string;
  githubPortfolio?: string;
  assignmentSent?: boolean;
  assignmentSentAt?: string | null;
  assignmentReceived?: boolean;
  assignmentReceivedAt?: string | null;
  interviewLinkSent?: boolean;
  interviewLinkSentAt?: string | null;
  interviewScheduledDate?: string | null;
  interviewStatus?: string;
  interviewRecordingLink?: string;
  portfolioUrl?: string;
  resumeLink?: string;
  educationStatus?: string;
  degreeDiscipline?: string;
  researchPapers?: string;
  internshipExperience?: string;
  duration?: string;
  aiMlProjects?: string;
  preferredStartDate?: string;
  currentQualification?: string;
  collegeUniversity?: string;
  relevantCourses?: string;
  socialMediaPlatforms?: string[];
  contentCreationSkills?: string[];
  portfolioWorkSamples?: string;
  hoursPerWeek?: string;
  workPreference?: string;
  expectations?: string;
  totalAiExperience?: string;
  agenticExperience?: string;
  currentTitle?: string;
  currentCompany?: string;
  highestDegree?: string;
  availabilityToStart?: string;
  agentFrameworks?: string[];
  llmPlatforms?: string[];
  vectorDatabases?: string[];
  planningApproaches?: string[];
  cloudPlatform?: string;
  devopsProficiency?: string;
  systemExperience?: string;
  timezone?: string;
  contractCommitment?: string;
  expectedMonthlyRate?: string;
  applicationSource?: string;
  coverNote?: string;
  fromHackathon?: 'yes' | 'no';
  hackathonTeamName?: string;
  hackathonResult?: 'winner' | 'participant';
  hackathonProblemStatementId?: string;
  hackathonProblemStatementTitle?: string;
  appliedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const STATUS_OPTIONS = APPLICATION_STATUSES;

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold tracking-wide',
        APPLICATION_STATUS_STYLES[value] || 'bg-gray-50 text-gray-700 border-gray-200'
      )}
    >
      {formatStatusLabel(value)}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 break-words leading-relaxed">{children}</dd>
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-gray-100', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-brand-primary">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const backToApplications = (location.state as { fromList?: string } | null)?.fromList
    ? `/applications?${(location.state as { fromList: string }).fromList}`
    : '/applications';
  const [application, setApplication] = useState<Application | null>(null);
  const [relatedApplications, setRelatedApplications] = useState<RelatedApplication[]>([]);
  const [status, setStatus] = useState('');
  const [relatedStatusDrafts, setRelatedStatusDrafts] = useState<Record<string, string>>({});
  const [savingRelatedId, setSavingRelatedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [recordings, setRecordings] = useState<AdminRecording[]>([]);
  const [newRecording, setNewRecording] = useState({ url: '', label: '', note: '' });
  const [source, setSource] = useState('');
  const [githubPortfolio, setGithubPortfolio] = useState('');
  const [assignmentSent, setAssignmentSent] = useState(false);
  const [assignmentReceived, setAssignmentReceived] = useState(false);
  const [interviewLinkSent, setInterviewLinkSent] = useState(false);
  const [interviewScheduledDate, setInterviewScheduledDate] = useState('');
  const [interviewStatus, setInterviewStatus] = useState('not_scheduled');
  const [interviewRecordingLink, setInterviewRecordingLink] = useState('');
  const [resumePreviewOpen, setResumePreviewOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchApplication();
  }, [id, isAuthenticated, isAdmin, navigate]);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const searchJobId = new URLSearchParams(location.search).get('jobId');
      const stateJobId = (location.state as { jobId?: string } | null)?.jobId;
      const targetJobId = searchJobId || stateJobId || undefined;

      const response = await fetch(API_CONFIG.ENDPOINTS.applicationById(id!, targetJobId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch application');
      }

      const data = await response.json();
      setApplication(data.data);
      setStatus(data.data.status);
      setAdminRemarks(data.data.adminRemarks || '');
      setRecordings(Array.isArray(data.data.adminRecordings) ? data.data.adminRecordings : []);
      setSource(data.data.source || '');
      setGithubPortfolio(
        data.data.githubPortfolio ||
          data.data.portfolioUrl ||
          data.data.portfolioWorkSamples ||
          ''
      );
      setAssignmentSent(Boolean(data.data.assignmentSent));
      setAssignmentReceived(Boolean(data.data.assignmentReceived));
      setInterviewLinkSent(Boolean(data.data.interviewLinkSent));
      setInterviewScheduledDate(toDatetimeLocal(data.data.interviewScheduledDate));
      setInterviewStatus(data.data.interviewStatus || 'not_scheduled');
      setInterviewRecordingLink(data.data.interviewRecordingLink || '');

      const related: RelatedApplication[] = Array.isArray(data.relatedApplications)
        ? data.relatedApplications
        : [];
      setRelatedApplications(related);
      setRelatedStatusDrafts(Object.fromEntries(related.map((app) => [app._id, app.status])));
    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, nextStatus: string, isCurrent = false) => {
    if (!application) return;
    if (isCurrent) {
      if (nextStatus === application.status) return;
      setSaving(true);
    } else {
      setSavingRelatedId(applicationId);
    }

    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.applicationStatus(applicationId), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const data = await response.json();
      const related: RelatedApplication[] = Array.isArray(data.relatedApplications)
        ? data.relatedApplications
        : relatedApplications;

      setRelatedApplications(related);
      setRelatedStatusDrafts(Object.fromEntries(related.map((app) => [app._id, app.status])));

      if (isCurrent || applicationId === application._id) {
        setApplication({
          ...application,
          ...data.data,
        });
        setStatus(data.data.status);
        setAssignmentSent(Boolean(data.data.assignmentSent));
        setAssignmentReceived(Boolean(data.data.assignmentReceived));
        setInterviewLinkSent(Boolean(data.data.interviewLinkSent));
        if (data.data.interviewStatus) setInterviewStatus(data.data.interviewStatus);
        if (data.data.interviewScheduledDate !== undefined) {
          setInterviewScheduledDate(toDatetimeLocal(data.data.interviewScheduledDate));
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setSaving(false);
      setSavingRelatedId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!application) return;
    setSavingNotes(true);
    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.applicationAdminNotes(application._id), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminRemarks,
          adminRecordings: recordings,
          source,
          githubPortfolio,
          assignmentSent,
          assignmentReceived,
          interviewLinkSent,
          interviewScheduledDate: interviewScheduledDate || null,
          interviewStatus,
          interviewRecordingLink,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save admin notes');
      }

      const data = await response.json();
      setApplication({
        ...application,
        ...data.data,
      });
      setAdminRemarks(data.data.adminRemarks || '');
      setRecordings(Array.isArray(data.data.adminRecordings) ? data.data.adminRecordings : []);
      setSource(data.data.source || '');
      setGithubPortfolio(data.data.githubPortfolio || '');
      setAssignmentSent(Boolean(data.data.assignmentSent));
      setAssignmentReceived(Boolean(data.data.assignmentReceived));
      setInterviewLinkSent(Boolean(data.data.interviewLinkSent));
      setInterviewScheduledDate(toDatetimeLocal(data.data.interviewScheduledDate));
      setInterviewStatus(data.data.interviewStatus || 'not_scheduled');
      setInterviewRecordingLink(data.data.interviewRecordingLink || '');
    } catch (error) {
      console.error('Error saving admin notes:', error);
      alert('Failed to save hiring tracker / notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const addRecording = () => {
    const url = newRecording.url.trim();
    if (!url) {
      alert('Recording URL is required');
      return;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      alert('Please enter a valid recording URL');
      return;
    }

    setRecordings((prev) => [
      ...prev,
      {
        url,
        label: newRecording.label.trim(),
        note: newRecording.note.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewRecording({ url: '', label: '', note: '' });
  };

  const removeRecording = (index: number) => {
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary opacity-70" />
        <p className="text-sm font-medium text-slate-500">Loading application…</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <FileText className="h-6 w-6 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">Application not found</p>
          <p className="mt-1 text-sm text-slate-500">This record may have been removed or the link is invalid.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(backToApplications)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to applications
        </Button>
      </div>
    );
  }

  const isSocialMediaJob =
    application.jobId === 'TV-MKT-SMM-2025-003' || application.jobId === 'TV-MKT-SMM-2026-003';
  const isGenAiJob = application.jobId === 'TV-AI-GEN-2026-009';
  const initials = application.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const previousSameRoleApps = relatedApplications
    .filter(
      (app) =>
        app._id !== application._id && isSameRoleFamily(app.jobId, application.jobId)
    )
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  const hasReappliedSameRole = previousSameRoleApps.length > 0;
  const roleFamilyLabel = getRoleFamilyLabel(application.jobId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-gray-100">
        <div className="bg-gradient-to-r from-brand-primary to-[#023e8a] px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(backToApplications)}
                className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold tracking-wide ring-2 ring-white/30">
                  {initials || 'TV'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {application.fullName}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-white/80">{getJobTitle(application.jobId)}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <StatusBadge value={application.status} />
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/80">
                      {application.jobId}
                    </span>
                    <span className="text-xs text-white/60">·</span>
                    <span className="text-xs text-white/70">
                      {relatedApplications.length} role{relatedApplications.length !== 1 ? 's' : ''} applied
                    </span>
                    {hasReappliedSameRole && (
                      <>
                        <span className="text-xs text-white/60">·</span>
                        <span className="rounded-full bg-amber-400/25 px-2.5 py-0.5 text-xs font-medium text-amber-50 ring-1 ring-amber-300/30">
                          Applied to {roleFamilyLabel} before
                        </span>
                      </>
                    )}
                    <span className="text-xs text-white/60">·</span>
                    <span className="text-xs text-white/70">
                      Applied {format(new Date(application.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-44 border-white/20 bg-white text-slate-900 font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatStatusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(application._id, status, true)}
                disabled={saving || status === application.status}
                className="bg-white font-semibold text-brand-primary hover:bg-brand-accent disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? 'Saving…' : 'Save status'}
              </Button>
            </div>
          </div>
        </div>

        {/* Contact bar */}
        <div className="grid gap-2.5 border-t border-slate-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-5 sm:px-6">
          <a
            href={`mailto:${application.email}`}
            className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-brand-accent/60 hover:text-brand-primary"
          >
            <Mail className="h-4 w-4 shrink-0 text-brand-primary" />
            <span className="truncate">{application.email}</span>
          </a>
          <a
            href={`tel:${application.phone}`}
            className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-brand-accent/60 hover:text-brand-primary"
          >
            <Phone className="h-4 w-4 shrink-0 text-brand-primary" />
            <span>{application.phone}</span>
          </a>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <MapPin className="h-4 w-4 shrink-0 text-brand-primary" />
            <span className="truncate">{application.location}</span>
          </div>
          <a
            href={application.linkedinProfile}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-brand-accent/60 hover:text-brand-primary"
          >
            <Linkedin className="h-4 w-4 shrink-0 text-brand-primary" />
            <span>LinkedIn profile</span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
          </a>
          {application.resumeLink ? (
            <button
              type="button"
              onClick={() => setResumePreviewOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-brand-accent/60 hover:text-brand-primary text-left"
            >
              <FileText className="h-4 w-4 shrink-0 text-brand-primary" />
              <span>View resume</span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
              <FileText className="h-4 w-4 shrink-0" />
              <span>No resume</span>
            </div>
          )}
        </div>
      </div>

      {/* Application history for this email */}
      <Section
        title="Application history for this candidate"
        description="Every application from this email, including earlier openings for the same role family."
      >
        {hasReappliedSameRole && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            This candidate applied to <span className="font-semibold">{roleFamilyLabel}</span>{' '}
            previously ({previousSameRoleApps.length} earlier application
            {previousSameRoleApps.length !== 1 ? 's' : ''}), and has applied again.
            <ul className="mt-2 space-y-1 text-amber-900/80">
              {previousSameRoleApps.map((app) => (
                <li key={app._id} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
                  <Link
                    to={`/applications/${app._id}`}
                    state={location.state}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {getJobTitle(app.jobId)}
                  </Link>
                  {' · '}
                  {format(new Date(app.createdAt), 'MMM d, yyyy')}
                  {' · '}
                  {app.status}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3">
          {relatedApplications.map((app) => {
            const draft = relatedStatusDrafts[app._id] || app.status;
            const isCurrent = app._id === application._id;
            const isEarlierSameRole =
              !isCurrent && isSameRoleFamily(app.jobId, application.jobId);
            return (
              <div
                key={app._id}
                className={cn(
                  'rounded-xl border p-4 transition',
                  isCurrent
                    ? 'border-brand-primary/30 bg-brand-accent/40'
                    : isEarlierSameRole
                      ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{getJobTitle(app.jobId)}</p>
                      {isCurrent && (
                        <Badge className="bg-brand-primary text-white hover:bg-brand-primary">
                          Viewing
                        </Badge>
                      )}
                      {isEarlierSameRole && (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-100 text-amber-900"
                        >
                          Earlier {roleFamilyLabel} application
                        </Badge>
                      )}
                      <StatusBadge value={app.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {app.jobId} · Applied {format(new Date(app.createdAt), 'MMM d, yyyy')}
                      {app.hasRemarks ? ' · Has remarks' : ''}
                      {app.recordingsCount ? ` · ${app.recordingsCount} recording(s)` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={draft}
                      onValueChange={(value) =>
                        setRelatedStatusDrafts((prev) => ({ ...prev, [app._id]: value }))
                      }
                    >
                      <SelectTrigger className="h-9 w-36 bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatStatusLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingRelatedId === app._id || draft === app.status}
                      onClick={() => handleStatusUpdate(app._id, draft, isCurrent)}
                    >
                      {savingRelatedId === app._id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {savingRelatedId === app._id ? 'Saving…' : 'Update'}
                    </Button>
                    {!isCurrent && (
                      <Link to={`/applications/${app._id}`} state={location.state}>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Eye className="h-4 w-4" />
                          Open
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Candidate details */}
        <div className="space-y-6 lg:col-span-3">
          <Section title="Application overview">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Role">{getJobTitle(application.jobId)}</Field>
              <Field label="Status">
                <StatusBadge value={application.status} />
              </Field>
              <Field label={isGenAiJob ? 'Expected rate (₹ / month)' : 'Expected stipend'}>
                {isGenAiJob ? application.expectedMonthlyRate : application.expectedStipend}
              </Field>
              <Field label="Preferred start">
                {(isGenAiJob ? application.availabilityToStart : application.preferredStartDate) || '—'}
              </Field>
              <Field label="Applied">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {format(new Date(application.createdAt), 'PPp')}
                </span>
              </Field>
              <Field label="Last updated">
                {format(new Date(application.updatedAt), 'PPp')}
              </Field>
            </dl>
          </Section>

          {application.fromHackathon && (
            <Section title="AI HACK X MRDU hackathon">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Took part">{application.fromHackathon === 'yes' ? 'Yes' : 'No'}</Field>
                {application.fromHackathon === 'yes' && (
                  <>
                    <Field label="Team name">{application.hackathonTeamName}</Field>
                    <Field label="Result">
                      {application.hackathonResult === 'winner' ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Winner</Badge>
                      ) : (
                        'Participant'
                      )}
                    </Field>
                    <Field label="Problem statement">
                      {application.hackathonProblemStatementTitle}
                      {application.hackathonProblemStatementId && (
                        <span className="ml-1 text-slate-400">({application.hackathonProblemStatementId})</span>
                      )}
                    </Field>
                  </>
                )}
              </dl>
            </Section>
          )}

          {isGenAiJob && (
            <Section title="GenAI experience & contract fit">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Total AI/ML experience">{application.totalAiExperience}</Field>
                <Field label="Agentic systems experience">{application.agenticExperience}</Field>
                <Field label="Current title">{application.currentTitle}</Field>
                <Field label="Current company">{application.currentCompany}</Field>
                <Field label="Highest qualification">{application.highestDegree}</Field>
                <Field label="Cloud platform">{application.cloudPlatform}</Field>
                <Field label="Docker / K8s / CI-CD">{application.devopsProficiency}</Field>
                <Field label="Timezone">{application.timezone}</Field>
                <Field label="3-month commitment">{application.contractCommitment}</Field>
                <Field label="Source">{application.applicationSource}</Field>
              </dl>

              {[
                { label: 'Agent frameworks', values: application.agentFrameworks },
                { label: 'LLM platforms', values: application.llmPlatforms },
                { label: 'Vector databases', values: application.vectorDatabases },
                { label: 'Planning approaches', values: application.planningApproaches },
              ].map(({ label, values }) =>
                values && values.length > 0 ? (
                  <div key={label} className="mt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map((value) => (
                        <Badge key={value} variant="secondary" className="px-2.5 py-0.5">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null
              )}

              {application.systemExperience && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    RAG / multi-agent system built
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {application.systemExperience}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {application.portfolioUrl && (
                  <a
                    href={application.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    GitHub / portfolio
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {application.resumeLink && (
                  <>
                    <button
                      type="button"
                      onClick={() => setResumePreviewOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View resume
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadFile(
                          getResumeDownloadUrl(application.resumeLink!, API_CONFIG.ENDPOINTS.RESUME_PROXY),
                          `resume-${application._id}.pdf`,
                          application.resumeLink
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download resume
                    </button>
                  </>
                )}
              </div>
            </Section>
          )}

          {!isSocialMediaJob && !isGenAiJob && (
            <Section title="Education & experience">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Education status">{application.educationStatus}</Field>
                <Field label="Degree / discipline">{application.degreeDiscipline}</Field>
                <Field label="Internship experience">{application.internshipExperience}</Field>
                <Field label="Duration">{application.duration}</Field>
                <Field label="AI/ML projects">{application.aiMlProjects}</Field>
                <Field label="Research papers">{application.researchPapers}</Field>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {application.portfolioUrl && (
                  <a
                    href={application.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    Portfolio
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {application.resumeLink && (
                  <>
                    <button
                      type="button"
                      onClick={() => setResumePreviewOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View resume
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadFile(
                          getResumeDownloadUrl(application.resumeLink!, API_CONFIG.ENDPOINTS.RESUME_PROXY),
                          `resume-${application._id}.pdf`,
                          application.resumeLink
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download resume
                    </button>
                  </>
                )}
              </div>
            </Section>
          )}

          {isSocialMediaJob && (
            <Section title="Education & qualifications">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Current qualification">{application.currentQualification}</Field>
                <Field label="College / university">{application.collegeUniversity}</Field>
                <Field label="Relevant courses">{application.relevantCourses}</Field>
                <Field label="Work preference">{application.workPreference}</Field>
                <Field label="Hours per week">{application.hoursPerWeek}</Field>
                <Field label="Expectations">{application.expectations}</Field>
              </dl>
              {application.socialMediaPlatforms && application.socialMediaPlatforms.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Platforms
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {application.socialMediaPlatforms.map((platform) => (
                      <Badge key={platform} variant="secondary" className="px-2.5 py-0.5">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {application.contentCreationSkills && application.contentCreationSkills.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {application.contentCreationSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="px-2.5 py-0.5">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {application.portfolioWorkSamples && (
                  <a
                    href={application.portfolioWorkSamples}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                  >
                    Portfolio samples
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {application.resumeLink && (
                  <>
                    <button
                      type="button"
                      onClick={() => setResumePreviewOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View resume
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadFile(
                          getResumeDownloadUrl(application.resumeLink!, API_CONFIG.ENDPOINTS.RESUME_PROXY),
                          `resume-${application._id}.pdf`,
                          application.resumeLink
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-accent transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download resume
                    </button>
                  </>
                )}
              </div>
            </Section>
          )}

          <Section title={isGenAiJob ? 'Cover note' : 'Motivation'}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {(isGenAiJob ? application.coverNote : application.motivation) || '—'}
            </p>
          </Section>
        </div>

        {/* Hiring tracker + notes */}
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Hiring tracker"
            description="Assignment & interview pipeline for this candidate"
            action={
              <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes} className="gap-1.5">
                {savingNotes ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {savingNotes ? 'Saving…' : 'Save'}
              </Button>
            }
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Candidate
                </label>
                <p className="text-sm font-semibold text-slate-900">{application.fullName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{application.email}</p>
                <p className="text-xs text-slate-500">{application.phone}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Source
                </label>
                <Select
                  value={source || 'unset'}
                  onValueChange={(value) => setSource(value === 'unset' ? '' : value)}
                >
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    {SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  GitHub / Portfolio
                </label>
                <Input
                  value={githubPortfolio}
                  onChange={(e) => setGithubPortfolio(e.target.value)}
                  placeholder="https://github.com/… or portfolio URL"
                  className="bg-white text-sm"
                />
              </div>

              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer select-none">
                  <Checkbox
                    checked={assignmentSent}
                    onChange={(e) => setAssignmentSent(e.target.checked)}
                  />
                  Assignment sent
                </label>
                <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer select-none">
                  <Checkbox
                    checked={assignmentReceived}
                    onChange={(e) => setAssignmentReceived(e.target.checked)}
                  />
                  Assignment received
                </label>
                <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer select-none">
                  <Checkbox
                    checked={interviewLinkSent}
                    onChange={(e) => setInterviewLinkSent(e.target.checked)}
                  />
                  Interview link sent
                </label>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Interview scheduled date
                </label>
                <Input
                  type="datetime-local"
                  value={interviewScheduledDate}
                  onChange={(e) => setInterviewScheduledDate(e.target.value)}
                  className="bg-white text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Interview status
                </label>
                <Select value={interviewStatus} onValueChange={setInterviewStatus}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_STATUSES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {formatStatusLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Interview meeting recording link
                </label>
                <Input
                  value={interviewRecordingLink}
                  onChange={(e) => setInterviewRecordingLink(e.target.value)}
                  placeholder="https://…"
                  className="bg-white text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <FileText className="h-3.5 w-3.5" />
                  Remarks
                </label>
                <Textarea
                  className="min-h-[110px] resize-y rounded-xl border-amber-200 bg-amber-50 text-sm text-slate-800 placeholder:text-amber-400/70 focus-visible:ring-amber-300"
                  placeholder="Interview notes, feedback, next steps…"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section
            title="Extra recordings"
            description="Additional interview / call recordings"
            action={
              <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={savingNotes} className="gap-1.5">
                {savingNotes ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {savingNotes ? 'Saving…' : 'Save'}
              </Button>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Video className="h-3.5 w-3.5" />
                  Recordings
                </label>

                {recordings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-8 text-center">
                    <Video className="mb-2 h-6 w-6 text-slate-300" />
                    <p className="text-sm text-slate-400">No recordings yet</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recordings.map((recording, index) => (
                      <div
                        key={`${recording.url}-${index}`}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-gray-50"
                      >
                        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-primary/10">
                            <Video className="h-3.5 w-3.5 text-brand-primary" />
                          </div>
                          <p className="flex-1 text-sm font-semibold text-slate-800 truncate">
                            {recording.label || `Recording ${index + 1}`}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 shrink-0 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeRecording(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="px-3 py-2.5">
                          <a
                            href={recording.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 break-all text-xs text-blue-600 hover:underline"
                          >
                            {recording.url}
                            <ExternalLink className="h-3 w-3 shrink-0 ml-0.5" />
                          </a>
                          {recording.note && (
                            <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-600 leading-relaxed">
                              {recording.note}
                            </p>
                          )}
                          {recording.createdAt && (
                            <p className="mt-1.5 text-[10px] text-slate-400">
                              Added {format(new Date(recording.createdAt), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Add recording</p>
                  <Input
                    placeholder="Recording URL *"
                    value={newRecording.url}
                    onChange={(e) => setNewRecording((prev) => ({ ...prev, url: e.target.value }))}
                    className="bg-white text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Label"
                      value={newRecording.label}
                      onChange={(e) =>
                        setNewRecording((prev) => ({ ...prev, label: e.target.value }))
                      }
                      className="bg-white text-sm"
                    />
                    <Input
                      placeholder="Note"
                      value={newRecording.note}
                      onChange={(e) => setNewRecording((prev) => ({ ...prev, note: e.target.value }))}
                      className="bg-white text-sm"
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addRecording} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Add recording
                  </Button>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <ResumePreviewDialog
        open={resumePreviewOpen}
        onOpenChange={setResumePreviewOpen}
        resumeLink={application.resumeLink}
        candidateName={application.fullName}
        applicationId={application._id}
      />
    </div>
  );
}
