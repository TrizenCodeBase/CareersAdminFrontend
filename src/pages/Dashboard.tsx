import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { APPLICATION_STATUSES, formatStatusLabel } from '@/config/applicationStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, XCircle, Clock, Send, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  totalApplications: number;
  recentApplications: number;
  statusBreakdown: Record<string, number>;
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

export default function Dashboard() {
  const { token, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchStats();
  }, [isAuthenticated, isAdmin, navigate]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/stats/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-sm font-medium tracking-wide">Loading dashboard…</span>
      </div>
    );
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
    },
    {
      title: 'Recent (7 days)',
      value: stats.recentApplications,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Pending',
      value: breakdown.pending || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Assignment sent',
      value: breakdown.assignment_sent || 0,
      icon: Send,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      title: 'Shortlisted',
      value: breakdown.shortlisted || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Accepted',
      value: breakdown.accepted || 0,
      icon: CheckCircle,
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Rejected',
      value: breakdown.rejected || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-8 px-1">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of job applications</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow duration-200"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-4xl font-extrabold text-gray-900 leading-none">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Status breakdown */}
      <Card className="shadow-sm ring-1 ring-gray-100">
        <CardHeader className="px-6 pt-5 pb-3 border-b border-gray-50">
          <CardTitle className="text-base font-semibold text-gray-800">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {APPLICATION_STATUSES.map((status) => {
              const borderClass = STATUS_BORDER_COLOR[status] ?? 'border-l-gray-300';
              return (
                <div
                  key={status}
                  className={`p-4 bg-slate-50 rounded-lg border-l-4 ${borderClass} hover:bg-slate-100 transition-colors duration-150`}
                >
                  <div className="text-2xl font-bold text-slate-800">{breakdown[status] || 0}</div>
                  <div className="text-xs font-medium text-gray-500 mt-1 truncate">
                    {formatStatusLabel(status)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Email Upload */}
      <Card className="shadow-sm ring-1 ring-gray-100">
        <CardHeader className="flex flex-row items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-50">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-lg">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-gray-800">Bulk Email Upload</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Send emails from an Excel / CSV list</p>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Need to send emails from an Excel/CSV list? Use the dedicated bulk upload tool.
          </p>
          <Button onClick={() => navigate('/bulk-email-upload')}>
            Go to Bulk Email Upload
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
