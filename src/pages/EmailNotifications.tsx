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
    // Clear selections when filter changes
    setSelectedApplications(new Set());
  }, [isAuthenticated, isAdmin, navigate, statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '100', // Get more applications for email sending
      });

      const url = `${API_CONFIG.ENDPOINTS.APPLICATIONS}?${params}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid - logout and redirect to login
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
      // Map status to correct endpoint
      // 'accepted' status -> send acceptance email
      // 'rejected' status -> send rejection email
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
        // Token expired or invalid - logout and redirect to login
        logout();
        navigate('/login');
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh applications to get updated emailSent status from database
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

  // Get applications that can be selected (not already sent)
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

  // SelectAllCheckbox component with indeterminate state support
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-9 w-9 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500 font-medium">Loading applications…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Email Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Send acceptance or rejection emails to candidates</p>
        </div>
      </div>

      {/* Inline Filter Bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <label className="text-sm font-medium text-gray-600 shrink-0">Filter by status:</label>
        <Select value={statusFilter} onValueChange={(value: 'accepted' | 'rejected') => setStatusFilter(value)}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="accepted">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Accepted
              </div>
            </SelectItem>
            <SelectItem value="rejected">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Rejected
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{applications.length}</span>{' '}
          {statusFilter === 'accepted' ? 'accepted' : 'rejected'} application{applications.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Applications Table */}
      <Card className="shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <CardHeader className="border-b border-gray-100 px-6 py-4">
          <CardTitle className="text-base font-semibold text-gray-800">
            {statusFilter === 'accepted' ? 'Accepted' : 'Rejected'} Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-12 px-4 py-3">
                    <SelectAllCheckbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={(checked) => handleSelectAll(checked)}
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Name</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Email</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Job Role</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Applied Date</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                        <Mail className="h-10 w-10 opacity-40" />
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
                        className={`transition-colors ${index % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'} hover:bg-blue-50/40`}
                      >
                        <TableCell className="px-4 py-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(app._id, e.target.checked)}
                            disabled={!isSelectable || isSending}
                            aria-label={`Select ${app.fullName}`}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3 font-medium text-gray-900 text-sm">{app.fullName}</TableCell>
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
                        <TableCell className="px-4 py-3 text-sm text-gray-700">{getJobTitle(app.jobId)}</TableCell>
                        <TableCell className="px-4 py-3">{getStatusBadge(app.status)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600">
                          {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          {(() => {
                            // Check if email was already sent for this status
                            const emailAlreadySent = app.emailSent && 
                              app.emailType === (statusFilter === 'accepted' ? 'acceptance' : 'rejection') &&
                              app.status === statusFilter;
                            const isCurrentlySending = sendingEmails.has(app._id);
                            
                            if (emailAlreadySent && !isCurrentlySending) {
                              return (
                                <Badge className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 px-2.5 py-1 rounded-full text-xs font-medium">
                                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                  Email Sent
                                  {app.emailSentAt && (
                                    <span className="text-green-500 font-normal">
                                      · {format(new Date(app.emailSentAt), 'MMM dd')}
                                    </span>
                                  )}
                                </Badge>
                              );
                            }
                            
                            return (
                              <Button
                                onClick={() => sendEmail(app._id, statusFilter)}
                                disabled={isCurrentlySending}
                                size="sm"
                                className={`h-8 px-3 text-xs font-medium inline-flex items-center gap-1.5 ${statusFilter === 'accepted' ? 'bg-green-600 hover:bg-green-700 active:bg-green-800' : 'bg-red-600 hover:bg-red-700 active:bg-red-800'}`}
                              >
                                {isCurrentlySending ? (
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

      {/* Bulk Actions Card */}
      {applications.length > 0 && (
        <Card className="bg-blue-50 border border-blue-200 shadow-sm ring-0">
          <CardHeader className="border-b border-blue-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base font-semibold text-blue-900">Bulk Actions</CardTitle>
              {selectedApplications.size > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
                  {selectedApplications.size} selected
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 py-4">
            <div className="flex items-center gap-3 flex-wrap">
              {selectedApplications.size > 0 ? (
                <Button
                  onClick={async () => {
                    const selectedApps = applications.filter(app => selectedApplications.has(app._id));
                    
                    if (selectedApps.length === 0) {
                      alert('No applications selected!');
                      return;
                    }

                    if (!confirm(`Send ${statusFilter} emails to ${selectedApps.length} selected candidate(s)?`)) {
                      return;
                    }

                    for (const app of selectedApps) {
                      await sendEmail(app._id, statusFilter);
                      // Small delay between emails
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    // Clear selections and refresh applications after bulk send
                    setSelectedApplications(new Set());
                    await fetchApplications();
                  }}
                  variant="default"
                  disabled={sendingEmails.size > 0}
                  className={`h-9 px-4 text-sm font-medium inline-flex items-center gap-2 ${statusFilter === 'accepted' ? 'bg-green-600 hover:bg-green-700 active:bg-green-800' : 'bg-red-600 hover:bg-red-700 active:bg-red-800'}`}
                >
                  <Mail className="h-4 w-4" />
                  Send to Selected ({selectedApplications.size})
                </Button>
              ) : null}
              <Button
                onClick={async () => {
                  // Filter applications that haven't had this type of email sent yet
                  const unsentApplications = applications.filter(app => {
                    const emailAlreadySent = app.emailSent && 
                      app.emailType === (statusFilter === 'accepted' ? 'acceptance' : 'rejection') &&
                      app.status === statusFilter;
                    return !emailAlreadySent;
                  });
                  
                  if (unsentApplications.length === 0) {
                    alert('All emails have already been sent!');
                    return;
                  }

                  if (!confirm(`Send ${statusFilter} emails to ${unsentApplications.length} candidate(s)?`)) {
                    return;
                  }

                  for (const app of unsentApplications) {
                    await sendEmail(app._id, statusFilter);
                    // Small delay between emails
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                  
                  // Refresh applications after bulk send
                  await fetchApplications();
                }}
                variant="outline"
                disabled={sendingEmails.size > 0}
                className="h-9 px-4 text-sm font-medium inline-flex items-center gap-2 border-blue-300 text-blue-800 bg-white hover:bg-blue-100"
              >
                <Mail className="h-4 w-4" />
                Send All {statusFilter === 'accepted' ? 'Acceptance' : 'Rejection'} Emails
              </Button>
              <div className="ml-auto text-sm text-blue-700 font-medium">
                {applications.filter(app => 
                  app.emailSent && 
                  app.emailType === (statusFilter === 'accepted' ? 'acceptance' : 'rejection') &&
                  app.status === statusFilter
                ).length} of {applications.length} emails sent
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
