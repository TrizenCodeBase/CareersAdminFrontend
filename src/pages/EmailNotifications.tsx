import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { getJobTitle } from '@/config/jobs';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

interface Application {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  jobId: string;
  status: string;
  createdAt: string;
  emailSent?: boolean;
  emailSentAt?: string;
  emailType?: 'acceptance' | 'rejection' | null;
}

export default function EmailNotifications() {
  const { token, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'accepted' | 'rejected'>('accepted');
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchApplications();
    setSelectedApplications(new Set());
  }, [isAuthenticated, isAdmin, navigate, statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '100',
      });

      const url = `${API_CONFIG.ENDPOINTS.APPLICATIONS}?${params}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch applications: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setApplications(data.data);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (applicationId: string, status: 'accepted' | 'rejected') => {
    setSendingEmails(prev => new Set(prev).add(applicationId));

    try {
      const endpoint = status === 'accepted' 
        ? `${API_CONFIG.ENDPOINTS.APPLICATIONS}/${applicationId}/send-acceptance-email`
        : `${API_CONFIG.ENDPOINTS.APPLICATIONS}/${applicationId}/send-rejection-email`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchApplications();
        alert(`Email sent successfully!`);
      } else {
        alert(`Failed to send email: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicationId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return (
        <Badge className="inline-flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">
          <CheckCircle className="h-3 w-3" />
          Accepted
        </Badge>
      );
    } else if (status === 'rejected') {
      return (
        <Badge className="inline-flex items-center gap-1 bg-red-100 text-red-800 hover:bg-red-100 px-2 py-0.5 rounded-full text-xs font-medium">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    }
    return <Badge>{status}</Badge>;
  };

  const getSelectableApplications = () => {
    return applications.filter(app => {
      const emailAlreadySent = app.emailSent && 
        app.emailType === (statusFilter === 'accepted' ? 'acceptance' : 'rejection') &&
        app.status === statusFilter;
      return !emailAlreadySent;
    });
  };

  const selectableApplications = getSelectableApplications();
  const allSelected = selectableApplications.length > 0 && 
    selectableApplications.every(app => selectedApplications.has(app._id));
  const someSelected = selectableApplications.some(app => selectedApplications.has(app._id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = new Set(selectableApplications.map(app => app._id));
      setSelectedApplications(selectableIds);
    } else {
      setSelectedApplications(new Set());
    }
  };

  const handleSelectOne = (applicationId: string, checked: boolean) => {
    setSelectedApplications(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(applicationId);
      } else {
        newSet.delete(applicationId);
      }
      return newSet;
    });
  };

  const SelectAllCheckbox = ({ checked, indeterminate, onChange }: { 
    checked: boolean; 
    indeterminate: boolean; 
    onChange: (checked: boolean) => void;
  }) => {
    const checkboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <Checkbox
        ref={checkboxRef}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="Select all"
      />
    );
  };

  const pendingCount = getSelectableApplications().length;

  return (
    <div className="space-y-6 px-1 relative min-h-screen pb-24">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary to-[#0077b6]" />
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-accent text-primary rounded-xl shrink-0">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Email Notifications</h1>
              <p className="text-sm text-gray-500 mt-1">Send acceptance or rejection emails to candidates</p>
            </div>
          </div>
          <Badge className="bg-accent text-primary hover:bg-accent/80 text-sm px-3 py-1 font-semibold border-0 ring-1 ring-primary/10 hidden sm:inline-flex">
            {pendingCount} Pending Emails
          </Badge>
        </div>
      </div>

      {/* Inline Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <span className="text-sm font-medium text-gray-600 shrink-0">Filter by status:</span>
        <div className="flex p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setStatusFilter('accepted')}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
              statusFilter === 'accepted' 
                ? 'bg-white text-green-700 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-slate-200/50'
            }`}
          >
            <CheckCircle className={`h-4 w-4 ${statusFilter === 'accepted' ? 'text-green-600' : 'text-gray-400'}`} /> 
            Accepted
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
              statusFilter === 'rejected' 
                ? 'bg-white text-red-700 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-slate-200/50'
            }`}
          >
            <XCircle className={`h-4 w-4 ${statusFilter === 'rejected' ? 'text-red-600' : 'text-gray-400'}`} /> 
            Rejected
          </button>
        </div>
        <div className="text-sm text-gray-500 sm:ml-auto">
          <span className="font-semibold text-gray-700">{applications.length}</span>{' '}
          {statusFilter === 'accepted' ? 'accepted' : 'rejected'} application{applications.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
           {[...Array(5)].map((_, i) => (
             <div key={i} className="skeleton h-16 w-full rounded-xl" />
           ))}
        </div>
      ) : (
        <Card className="shadow-sm ring-1 ring-gray-100 overflow-hidden border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-gray-200">
                    <TableHead className="w-12 px-4 py-3 sticky top-0 z-[5] bg-slate-50">
                      <SelectAllCheckbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={(checked) => handleSelectAll(checked)}
                      />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sticky top-0 z-[5] bg-slate-50">Name</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sticky top-0 z-[5] bg-slate-50">Email</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sticky top-0 z-[5] bg-slate-50">Phone</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sticky top-0 z-[5] bg-slate-50">Job Role</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sticky top-0 z-[5] bg-slate-50">Status</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sticky top-0 z-[5] bg-slate-50">Applied Date</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right sticky top-0 z-[5] bg-slate-50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-20 text-center">
                        <div className="inline-flex flex-col items-center justify-center gap-3">
                          <div className="p-4 bg-slate-50 rounded-full">
                            <Mail className="h-8 w-8 text-slate-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">
                            No {statusFilter} applications found
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((app, index) => {
                      const isSending = sendingEmails.has(app._id);
                      const emailAlreadySent = app.emailSent && 
                        app.emailType === (statusFilter === 'accepted' ? 'acceptance' : 'rejection') &&
                        app.status === statusFilter;
                      const isSelectable = !emailAlreadySent;
                      const isSelected = selectedApplications.has(app._id);

                      return (
                        <TableRow
                          key={app._id}
                          className={`transition-colors duration-150 border-b border-gray-100 hover:bg-accent/20 ${index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                        >
                          <TableCell className="px-4 py-3">
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => handleSelectOne(app._id, e.target.checked)}
                              disabled={!isSelectable || isSending}
                              aria-label={`Select ${app.fullName}`}
                            />
                          </TableCell>
                          <TableCell className="px-4 py-3 font-semibold text-gray-900 text-sm">{app.fullName}</TableCell>
                          <TableCell className="px-4 py-3 text-sm">
                            <a href={`mailto:${app.email}`} className="text-blue-600 hover:underline">
                              {app.email}
                            </a>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm">
                            <a href={`tel:${app.phone}`} className="text-blue-600 hover:underline">
                              {app.phone}
                            </a>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm font-medium text-gray-700">{getJobTitle(app.jobId)}</TableCell>
                          <TableCell className="px-4 py-3">{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="px-4 py-3 text-sm text-gray-600">
                            {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {(() => {
                              if (emailAlreadySent && !isSending) {
                                return (
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                      Email Sent
                                    </Badge>
                                    {app.emailSentAt && (
                                      <span className="text-[11px] font-medium text-gray-400">
                                        {format(new Date(app.emailSentAt), 'MMM dd, yyyy')}
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              
                              const buttonColorClass = statusFilter === 'accepted' 
                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' 
                                : 'bg-red-600 hover:bg-red-700 text-white shadow-sm';

                              return (
                                <Button
                                  onClick={() => sendEmail(app._id, statusFilter)}
                                  disabled={isSending}
                                  size="sm"
                                  className={`h-8 px-4 text-xs font-semibold inline-flex items-center gap-2 transition-all ${buttonColorClass}`}
                                >
                                  {isSending ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Sending…
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="h-3.5 w-3.5" />
                                      Send {statusFilter === 'accepted' ? 'Acceptance' : 'Rejection'}
                                    </>
                                  )}
                                </Button>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky Bottom Action Bar */}
      {selectedApplications.size > 0 ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 ml-32 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-white rounded-full shadow-2xl border border-gray-200 px-6 py-3 flex items-center gap-6 ring-1 ring-black/5">
            <span className="text-sm font-semibold text-gray-800">
              <span className="text-primary mr-1.5">{selectedApplications.size}</span>
              candidate{selectedApplications.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedApplications(new Set())}
                className="text-gray-500 hover:text-gray-700 font-medium rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const selectedApps = applications.filter(app => selectedApplications.has(app._id));
                  if (!confirm(`Send ${statusFilter} emails to ${selectedApps.length} selected candidate(s)?`)) return;

                  for (const app of selectedApps) {
                    await sendEmail(app._id, statusFilter);
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                  
                  setSelectedApplications(new Set());
                  await fetchApplications();
                }}
                disabled={sendingEmails.size > 0}
                size="default"
                className={`rounded-full shadow-md font-semibold px-6 gap-2 ${
                  statusFilter === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Mail className="h-4 w-4" />
                Send to Selected
              </Button>
            </div>
          </div>
        </div>
      ) : (
        applications.length > 0 && !loading && (
          <Card className="bg-slate-50 border border-slate-200 shadow-sm mt-6">
            <CardContent className="px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Bulk Actions</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Send emails to all pending candidates at once.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600 font-medium">
                    {applications.length - pendingCount} of {applications.length} emails sent
                  </div>
                  <Button
                    onClick={async () => {
                      const unsentApplications = getSelectableApplications();
                      
                      if (unsentApplications.length === 0) {
                        alert('All emails have already been sent!');
                        return;
                      }

                      if (!confirm(`Send ${statusFilter} emails to ${unsentApplications.length} candidate(s)?`)) return;

                      for (const app of unsentApplications) {
                        await sendEmail(app._id, statusFilter);
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                      
                      await fetchApplications();
                    }}
                    variant="outline"
                    disabled={sendingEmails.size > 0 || pendingCount === 0}
                    className="font-semibold shadow-sm border-gray-300 gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send All {statusFilter === 'accepted' ? 'Acceptance' : 'Rejection'} Emails
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
