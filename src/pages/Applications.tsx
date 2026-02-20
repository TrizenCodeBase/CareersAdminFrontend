import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { downloadFile, getResumeDownloadUrl } from '@/lib/utils';

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
  // AIML/MERN specific fields
  portfolioUrl?: string;
  resumeLink?: string;
  educationStatus?: string;
  degreeDiscipline?: string;
  preferredStartDate?: string;
  // Social Media specific fields
  currentQualification?: string;
  collegeUniversity?: string;
  workPreference?: string;
  appliedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when search changes
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchApplications();
  }, [isAuthenticated, isAdmin, navigate, page, statusFilter, jobIdFilter, debouncedSearch]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(jobIdFilter !== 'all' && { jobId: jobIdFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
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
        const errorText = await response.text();
        console.error('Response error:', response.status, errorText);
        throw new Error(`Failed to fetch applications: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setApplications(data.data);
      setTotalPages(data.pagination?.totalPages || 1);
      } else {
        console.warn('Unexpected response format:', data);
        setApplications([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

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

  const getJobTitle = (jobId?: string) => {
    if (!jobId) return 'N/A';
    const jobMap: Record<string, string> = {
      'TV-AIML-INT-2025-001': 'AIML Intern',
      'TV-WEB-MERN-2025-005': 'MERN Stack Developer Intern',
      'TV-MKT-SMM-2025-003': 'Social Media Management Intern',
    };
    return jobMap[jobId] || jobId;
  };

  if (loading) {
    return <div className="text-center py-8">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">View and manage all job applications</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={statusFilter} onValueChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}>
          <SelectTrigger className="w-40">
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

        <Select value={jobIdFilter} onValueChange={(value) => {
          setJobIdFilter(value);
          setPage(1);
        }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Job Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="TV-AIML-INT-2025-001">AIML Intern</SelectItem>
            <SelectItem value="TV-WEB-MERN-2025-005">MERN Stack Developer</SelectItem>
            <SelectItem value="TV-MKT-SMM-2025-003">Social Media Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters Display */}
      {(jobIdFilter !== 'all' || statusFilter !== 'all' || debouncedSearch) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 font-medium">Active filters:</span>
          {jobIdFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Role: {getJobTitle(jobIdFilter)}
              <button
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
              Search: {debouncedSearch}
              <button
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

      {/* Results Count */}
      {!loading && applications.length > 0 && (
        <div className="text-sm text-gray-600">
          Showing {applications.length} application{applications.length !== 1 ? 's' : ''}
          {totalPages > 1 && ` (Page ${page} of ${totalPages})`}
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              <TableHead className="min-w-[120px]">Phone</TableHead>
              <TableHead className="min-w-[150px]">Location</TableHead>
              <TableHead className="min-w-[150px]">Job Role</TableHead>
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
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                  No applications found
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
                  <TableCell>{getJobTitle(app.jobId)}</TableCell>
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
                          onClick={() => downloadFile(getResumeDownloadUrl(app.resumeLink!, API_CONFIG.ENDPOINTS.RESUME_PROXY), `resume-${app._id}.pdf`)}
                          className="text-blue-600 hover:underline bg-transparent border-0 p-0 cursor-pointer font-inherit"
                        >
                          Resume
                        </button>
                      </>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

