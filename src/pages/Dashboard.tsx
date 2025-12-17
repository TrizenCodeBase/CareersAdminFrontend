import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  totalApplications: number;
  recentApplications: number;
  statusBreakdown: {
    pending: number;
    reviewed: number;
    shortlisted: number;
    rejected: number;
    accepted: number;
  };
}

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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
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
      value: stats.statusBreakdown.pending,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Shortlisted',
      value: stats.statusBreakdown.shortlisted,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Accepted',
      value: stats.statusBreakdown.accepted,
      icon: CheckCircle,
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Rejected',
      value: stats.statusBreakdown.rejected,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of job applications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.statusBreakdown.pending}</div>
              <div className="text-sm text-gray-600 mt-1">Pending</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.statusBreakdown.reviewed}</div>
              <div className="text-sm text-gray-600 mt-1">Reviewed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.statusBreakdown.shortlisted}</div>
              <div className="text-sm text-gray-600 mt-1">Shortlisted</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.statusBreakdown.rejected}</div>
              <div className="text-sm text-gray-600 mt-1">Rejected</div>
            </div>
            <div className="text-center p-4 bg-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{stats.statusBreakdown.accepted}</div>
              <div className="text-sm text-gray-600 mt-1">Accepted</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id={uploadSectionId}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Upload Excel for Emails
          </CardTitle>
          <p className="text-sm text-gray-600">
            Columns accepted: email (required), name, status (accepted/rejected), jobTitle, jobId
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              <span>Choose file (.xlsx or .csv)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
            <Button onClick={handleSendAll} disabled={!rows.length || uploading}>
              {uploading
                ? 'Parsing...'
                : sending
                  ? 'Sending...'
                  : rows.length
                    ? `Send ${rows.length} emails`
                    : 'Send Emails'}
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
          </div>

          {uploadError && (
            <div className="text-sm text-red-600">{uploadError}</div>
          )}

          {sendSummary && (
            <div className="text-sm space-y-1">
              <div className="text-green-600">Sent: {sendSummary.success}</div>
              <div className="text-red-600">Failed: {sendSummary.failed}</div>
              {sendSummary.errors.length > 0 && (
                <details className="text-red-600">
                  <summary className="cursor-pointer">View errors</summary>
                  <ul className="list-disc pl-5">
                    {sendSummary.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-700 mb-2">
                Preview (first 10 of {rows.length})
              </div>
              <div className="space-y-2 text-sm">
                {rows.slice(0, 10).map((r, idx) => (
                  <div key={idx} className="flex flex-wrap gap-3 border-b pb-2">
                    <span className="font-medium">{r.email}</span>
                    {r.name && <span>Name: {r.name}</span>}
                    {r.status && <span>Status: {r.status}</span>}
                    {r.jobTitle && <span>Job: {r.jobTitle}</span>}
                    {r.jobId && <span>ID: {r.jobId}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

