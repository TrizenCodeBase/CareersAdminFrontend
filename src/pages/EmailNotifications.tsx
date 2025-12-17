import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
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

  const getJobTitle = (jobId: string) => {
    const jobMap: Record<string, string> = {
      'TV-AIML-INT-2025-001': 'AIML Intern',
      'TV-WEB-MERN-2025-005': 'MERN Stack Developer Intern',
      'TV-MKT-SMM-2025-003': 'Social Media Management Intern',
    };
    return jobMap[jobId] || jobId;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    } else if (status === 'rejected') {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" />
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
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Notifications</h1>
          <p className="text-gray-600 mt-1">Send acceptance or rejection emails to candidates</p>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <Select value={statusFilter} onValueChange={(value: 'accepted' | 'rejected') => setStatusFilter(value)}>
              <SelectTrigger className="w-48">
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
            <div className="text-sm text-gray-600">
              {applications.length} {statusFilter === 'accepted' ? 'accepted' : 'rejected'} application{applications.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === 'accepted' ? 'Accepted' : 'Rejected'} Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <SelectAllCheckbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={(checked) => handleSelectAll(checked)}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Job Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No {statusFilter} applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => {
                    const isSending = sendingEmails.has(app._id);
                    const emailAlreadySent = app.emailSent && 
                      app.emailType === (statusFilter === 'accepted' ? 'acceptance' : 'rejection') &&
                      app.status === statusFilter;
                    const isSelectable = !emailAlreadySent;
                    const isSelected = selectedApplications.has(app._id);

                    return (
                      <TableRow key={app._id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(app._id, e.target.checked)}
                            disabled={!isSelectable || isSending}
                            aria-label={`Select ${app.fullName}`}
                          />
                        </TableCell>
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
                        <TableCell>{getJobTitle(app.jobId)}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell>
                          {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            // Check if email was already sent for this status
                            const emailAlreadySent = app.emailSent && 
                              app.emailType === (statusFilter === 'accepted' ? 'acceptance' : 'rejection') &&
                              app.status === statusFilter;
                            const isCurrentlySending = sendingEmails.has(app._id);
                            
                            if (emailAlreadySent && !isCurrentlySending) {
                              return (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Email Sent
                                  {app.emailSentAt && (
                                    <span className="ml-1 text-xs">
                                      ({format(new Date(app.emailSentAt), 'MMM dd')})
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
                                className={statusFilter === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                              >
                                {isCurrentlySending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send {statusFilter === 'accepted' ? 'Acceptance' : 'Rejection'} Email
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
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
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
                  className={statusFilter === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  <Mail className="h-4 w-4 mr-2" />
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
              >
                <Mail className="h-4 w-4 mr-2" />
                Send All {statusFilter === 'accepted' ? 'Acceptance' : 'Rejection'} Emails
              </Button>
              <div className="text-sm text-gray-600">
                {selectedApplications.size > 0 && (
                  <span className="mr-4">
                    {selectedApplications.size} selected
                  </span>
                )}
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

