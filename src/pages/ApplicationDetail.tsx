import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';

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
  // AIML/MERN specific fields
  portfolioUrl?: string;
  resumeLink?: string;
  educationStatus?: string;
  degreeDiscipline?: string;
  researchPapers?: string;
  internshipExperience?: string;
  duration?: string;
  aiMlProjects?: string;
  preferredStartDate?: string;
  // Social Media specific fields
  currentQualification?: string;
  collegeUniversity?: string;
  relevantCourses?: string;
  socialMediaPlatforms?: string[];
  contentCreationSkills?: string[];
  portfolioWorkSamples?: string;
  hoursPerWeek?: string;
  workPreference?: string;
  expectations?: string;
  appliedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const response = await fetch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch application');
      }

      const data = await response.json();
      setApplication(data.data);
      setStatus(data.data.status);
    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!application || status === application.status) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const data = await response.json();
      setApplication({ ...application, status: data.data.status });
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setSaving(false);
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

  if (loading) {
    return <div className="text-center py-8">Loading application details...</div>;
  }

  if (!application) {
    return <div className="text-center py-8 text-red-500">Application not found</div>;
  }

  const isSocialMediaJob = application.jobId === 'TV-MKT-SMM-2025-003';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/applications')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{application.fullName}</h1>
            <p className="text-gray-600 mt-1">{getJobTitle(application.jobId)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleStatusUpdate} disabled={saving || status === application.status}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Status'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Full Name</label>
              <p className="mt-1">{application.fullName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="mt-1">
                <a href={`mailto:${application.email}`} className="text-blue-600 hover:underline">
                  {application.email}
                </a>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <p className="mt-1">
                <a href={`tel:${application.phone}`} className="text-blue-600 hover:underline">
                  {application.phone}
                </a>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <p className="mt-1">{application.location}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">LinkedIn Profile</label>
              <p className="mt-1">
                <a href={application.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {application.linkedinProfile}
                </a>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Expected Stipend</label>
              <p className="mt-1">{application.expectedStipend}</p>
            </div>
          </CardContent>
        </Card>

        {/* Application Details */}
        <Card>
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Job Role</label>
              <p className="mt-1">{getJobTitle(application.jobId)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <p className="mt-1">{getStatusBadge(application.status)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Applied Date</label>
              <p className="mt-1">{format(new Date(application.createdAt), 'PPpp')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Last Updated</label>
              <p className="mt-1">{format(new Date(application.updatedAt), 'PPpp')}</p>
            </div>
            {application.preferredStartDate && (
              <div>
                <label className="text-sm font-medium text-gray-600">Preferred Start Date</label>
                <p className="mt-1">{application.preferredStartDate}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role-Specific Information */}
        {!isSocialMediaJob && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Education & Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.educationStatus && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Education Status</label>
                    <p className="mt-1">{application.educationStatus}</p>
                  </div>
                )}
                {application.degreeDiscipline && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Degree Discipline</label>
                    <p className="mt-1">{application.degreeDiscipline}</p>
                  </div>
                )}
                {application.portfolioUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Portfolio URL</label>
                    <p className="mt-1">
                      <a href={application.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {application.portfolioUrl}
                      </a>
                    </p>
                  </div>
                )}
                {application.resumeLink && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Resume Link</label>
                    <p className="mt-1">
                      <a href={application.resumeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {application.resumeLink}
                      </a>
                    </p>
                  </div>
                )}
                {application.researchPapers && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Research Papers</label>
                    <p className="mt-1 whitespace-pre-wrap">{application.researchPapers}</p>
                  </div>
                )}
                {application.internshipExperience && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Internship Experience</label>
                    <p className="mt-1 whitespace-pre-wrap">{application.internshipExperience}</p>
                  </div>
                )}
                {application.duration && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Duration</label>
                    <p className="mt-1">{application.duration}</p>
                  </div>
                )}
                {application.aiMlProjects && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">AI/ML Projects</label>
                    <p className="mt-1 whitespace-pre-wrap">{application.aiMlProjects}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {isSocialMediaJob && (
          <Card>
            <CardHeader>
              <CardTitle>Education & Qualifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.currentQualification && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Qualification</label>
                  <p className="mt-1">{application.currentQualification}</p>
                </div>
              )}
              {application.collegeUniversity && (
                <div>
                  <label className="text-sm font-medium text-gray-600">College/University</label>
                  <p className="mt-1">{application.collegeUniversity}</p>
                </div>
              )}
              {application.relevantCourses && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Relevant Courses</label>
                  <p className="mt-1 whitespace-pre-wrap">{application.relevantCourses}</p>
                </div>
              )}
              {application.socialMediaPlatforms && application.socialMediaPlatforms.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Social Media Platforms</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {application.socialMediaPlatforms.map((platform, idx) => (
                      <Badge key={idx} variant="secondary">{platform}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {application.contentCreationSkills && application.contentCreationSkills.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Content Creation Skills</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {application.contentCreationSkills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {application.portfolioWorkSamples && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Portfolio/Work Samples</label>
                  <p className="mt-1">
                    <a href={application.portfolioWorkSamples} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {application.portfolioWorkSamples}
                    </a>
                  </p>
                </div>
              )}
              {application.resumeLink && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Resume Link</label>
                  <p className="mt-1">
                    <a href={application.resumeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {application.resumeLink}
                    </a>
                  </p>
                </div>
              )}
              {application.workPreference && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Work Preference</label>
                  <p className="mt-1">{application.workPreference}</p>
                </div>
              )}
              {application.hoursPerWeek && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Hours Per Week</label>
                  <p className="mt-1">{application.hoursPerWeek}</p>
                </div>
              )}
              {application.expectations && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Expectations</label>
                  <p className="mt-1 whitespace-pre-wrap">{application.expectations}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Motivation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Motivation to Join</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-gray-700">{application.motivation}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

