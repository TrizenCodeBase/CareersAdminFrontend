/** Application + interview status labels for the admin hiring pipeline. */

export const APPLICATION_STATUSES = [
  'pending',
  'reviewed',
  'shortlisted',
  'assignment_sent',
  'assignment_received',
  'interview_link_sent',
  'interview_scheduled',
  'rejected',
  'accepted',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const INTERVIEW_STATUSES = [
  'not_scheduled',
  'scheduled',
  'completed',
  'no_show',
  'cancelled',
  'selected',
  'rejected',
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const SOURCE_OPTIONS = [
  'LinkedIn',
  'Careers site',
  'Referral',
  'Campus',
  'Email outreach',
  'Other',
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  assignment_sent: 'Assignment sent',
  assignment_received: 'Assignment received',
  interview_link_sent: 'Interview link sent',
  interview_scheduled: 'Interview scheduled',
  rejected: 'Rejected',
  accepted: 'Accepted',
  not_scheduled: 'Not scheduled',
  scheduled: 'Scheduled',
  completed: 'Completed',
  no_show: 'No show',
  cancelled: 'Cancelled',
  selected: 'Selected',
};

export function formatStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export const APPLICATION_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  reviewed: 'bg-slate-100 text-slate-700 border-slate-200',
  shortlisted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  assignment_sent: 'bg-sky-50 text-sky-800 border-sky-200',
  assignment_received: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  interview_link_sent: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  interview_scheduled: 'bg-violet-50 text-violet-800 border-violet-200',
  accepted: 'bg-green-50 text-green-800 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};
