import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Eye } from 'lucide-react';
import { format } from 'date-fns';

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
  const { token, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobIdFilter, setJobIdFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchApplications();
  }, [isAuthenticated, isAdmin, navigate, page, statusFilter, jobIdFilter, search]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(jobIdFilter !== 'all' && { jobId: jobIdFilter }),
        ...(search && { search }),
      });

      const response = await fetch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching applications:', error);
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
                setPage(1);
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
                        <a 
                          href={app.resumeLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline"
                        >
                          Resume
                        </a>
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

