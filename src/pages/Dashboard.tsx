import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { APPLICATION_STATUSES, formatStatusLabel } from '@/config/applicationStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, Mail, RotateCcw, ArrowRight, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  totalApplications: number;
  recentApplications: number;
  statusBreakdown: Record<string, number>;
  jobApplicationCounts: Record<string, number>;
}

interface ActiveJob {
  id: string;
  title: string;
  category?: string;
}

/** Map each application status to a left-border Tailwind colour class */
const STATUS_BORDER_COLOR: Record<string, string> = {
  pending: 'border-l-orange-400',
  shortlisted: 'border-l-green-500',
  rejected: 'border-l-red-400',
  accepted: 'border-l-emerald-500',
  assignment_sent: 'border-l-sky-400',
  interviewed: 'border-l-purple-400',
  offer_sent: 'border-l-teal-400',
  hired: 'border-l-green-700',
  withdrawn: 'border-l-gray-400',
};

/** Map each status to a solid progress-bar colour */
const STATUS_BAR_COLOR: Record<string, string> = {
  pending: 'bg-orange-400',
  shortlisted: 'bg-green-500',
  rejected: 'bg-red-400',
  accepted: 'bg-emerald-500',
  assignment_sent: 'bg-sky-400',
  interviewed: 'bg-purple-400',
  offer_sent: 'bg-teal-400',
  hired: 'bg-green-700',
  withdrawn: 'bg-gray-400',
};

/** Skeleton block for loading state */
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
  );
}

/** Skeleton card grid shown while data is loading */
function SkeletonDashboard() {
  return (
    <div className="space-y-8 px-1">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="h-1 bg-gray-100" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-10 w-10 rounded-2xl" />
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <SkeletonBlock className="h-9 w-16" />
              <SkeletonBlock className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <hr className="border-gray-100" />

      {/* Status breakdown skeleton */}
      <Card className="shadow-sm ring-1 ring-gray-100">
        <CardHeader className="px-6 pt-5 pb-3 border-b border-gray-50">
          <SkeletonBlock className="h-5 w-36" />
        </CardHeader>
        <CardContent className="px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg border-l-4 border-l-gray-200 space-y-2">
                <SkeletonBlock className="h-6 w-8" />
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { token, isAuthenticated, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchStats();
  }, [isAuthenticated, isAdmin, navigate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsResponse, jobsResponse] = await Promise.all([
        fetch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/stats/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        }),
        fetch(`${API_CONFIG.ENDPOINTS.JOBS}?status=published&sort=title&order=asc`, { headers }),
      ]);

      if (!statsResponse.ok || !jobsResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [statsData, jobsData] = await Promise.all([
        statsResponse.json(),
        jobsResponse.json(),
      ]);
      if (!statsData.success || !statsData.data || !jobsData.success || !Array.isArray(jobsData.data)) {
        throw new Error('The server returned invalid dashboard data');
      }
      setStats(statsData.data);
      setActiveJobs(jobsData.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load dashboard data</div>
      </div>
    );
  }

  const breakdown = stats.statusBreakdown || {};

  const statCards = [
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderTop: 'border-t-blue-500',
      description: 'Across all active applications',
    },
    {
      title: 'Recent (7 days)',
      value: stats.recentApplications,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderTop: 'border-t-yellow-500',
      description: 'Received in the last 7 days',
    },
    {
      title: 'Pending',
      value: breakdown.pending || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderTop: 'border-t-orange-500',
      description: 'Awaiting review',
    },
    {
      title: 'Live jobs',
      value: activeJobs.length,
      icon: Briefcase,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderTop: 'border-t-emerald-600',
      description: 'Accepting applications',
    },
  ];

  /* Compute max status value for proportional progress bars */
  const maxStatusValue = Math.max(
    1,
    ...APPLICATION_STATUSES.map((s) => breakdown[s] || 0),
  );

  /* Format today's date e.g. "Friday, October 9, 2026" */
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  /* Greeting based on time of day */
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const greeting = user?.firstName
    ? `Good ${timeOfDay}, ${user.firstName}!`
    : 'Welcome back!';

  return (
    <div className="space-y-6 px-1">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{greeting}</h1>
          <p className="text-sm text-gray-500 mt-1">{todayLabel} · Overview of job applications</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchStats}
          title="Refresh stats"
          className="shrink-0 rounded-xl border-gray-200 hover:border-[#03045E] hover:text-[#03045E] transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`shadow-sm ring-1 ring-gray-100 hover:shadow-md border-t-[3px] ${stat.borderTop} overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} ${stat.color} p-2.5 rounded-2xl`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-4xl font-extrabold text-gray-900 leading-none">
                  {stat.value}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden shadow-sm ring-1 ring-gray-100">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-gray-50 px-6 py-4">
          <div>
            <CardTitle className="text-base font-semibold text-gray-800">Live jobs</CardTitle>
            <p className="mt-0.5 text-xs text-gray-500">Applications received for each active job</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/jobs')} className="gap-1.5">
            Job management
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {activeJobs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">There are no live jobs right now.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => navigate(`/applications?jobId=${encodeURIComponent(job.id)}`)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{job.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                      {job.category || job.id}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-bold text-[#03045E]">
                      {stats.jobApplicationCounts?.[job.id] || 0}
                    </span>
                    <span className="block text-[11px] text-gray-500">applications</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Status breakdown ── */}
      <Card className="shadow-sm ring-1 ring-gray-100">
        <CardHeader className="px-6 pt-5 pb-3 border-b border-gray-50">
          <CardTitle className="text-base font-semibold text-gray-800">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {APPLICATION_STATUSES.map((status) => {
              const borderClass = STATUS_BORDER_COLOR[status] ?? 'border-l-gray-300';
              const barClass = STATUS_BAR_COLOR[status] ?? 'bg-gray-300';
              const count = breakdown[status] || 0;
              const pct = Math.round((count / maxStatusValue) * 100);
              return (
                <div
                  key={status}
                  className={`p-4 bg-slate-50 rounded-lg border-l-4 ${borderClass} hover:bg-slate-100 hover:scale-[1.02] transition-all duration-150 cursor-default`}
                >
                  <div className="text-2xl font-bold text-slate-800">{count}</div>
                  <div className="text-xs font-medium text-gray-500 mt-1 truncate">
                    {formatStatusLabel(status)}
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-2.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barClass} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Bulk Email Upload ── */}
      <Card className="shadow-sm ring-1 ring-gray-100">
        <CardHeader className="flex flex-row items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-50">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-gray-800">Bulk Email Upload</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Send personalised emails to multiple candidates at once</p>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Upload an Excel or CSV file to dispatch personalised emails to a large group of candidates in one go. Ideal for interview invitations, status updates, and offer communications.
          </p>
          <Button
            onClick={() => navigate('/bulk-email-upload')}
            className="bg-[#03045E] hover:bg-[#03045E]/90 text-white gap-2 rounded-xl px-5"
          >
            Go to Bulk Email Upload
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
