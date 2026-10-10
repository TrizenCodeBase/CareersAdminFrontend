import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  Search,
  Loader2,
  Pencil,
  Globe,
  EyeOff,
  X,
  Briefcase,
  MapPin,
  Clock,
  Tag,
  CheckCircle,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Job {
  _id: string;
  id: string;
  title: string;
  slug: string;
  location: string;
  type: string;
  category: string;
  shortDescription: string;
  description: string;
  applicationPrompt?: string;
  tags: string[];
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  selectionProcess: string[];
  preferredExperience?: string[];
  kpis?: string[];
  idealCandidate?: string;
  duration: string;
  startDate: string;
  applicationDeadline: string;
  postedDate: string;
  status: 'published' | 'draft' | 'closed';
  closedDate?: string | null;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type JobStatus = 'published' | 'draft' | 'closed';

const PRESET_CATEGORIES = ['AI/ML', 'Web Development', 'Business Development', 'Marketing', 'Engineering', 'Design', 'Operations', 'Other'];
const EMPLOYMENT_TYPES = ['Full-Time', 'Internship', 'Part-Time', 'Contract (3 Months)', 'Contract', 'Freelance'] as const;
const LOCATIONS = ['Remote', 'Remote / Hybrid', 'Hyderabad (Hybrid)', 'Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'On-Site'] as const;

const STATUS_CONFIG: Record<JobStatus, { label: string; className: string }> = {
  published: { label: 'Published', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft:     { label: 'Draft',     className: 'bg-amber-50  text-amber-700  border-amber-200'   },
  closed:    { label: 'Closed',    className: 'bg-gray-100  text-gray-600   border-gray-200'    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function splitLines(value: string): string[] {
  return value.split('\n').map(l => l.trim().replace(/^[-*•]\s*/, '')).filter(Boolean);
}

function joinLines(arr: string[]): string {
  return arr.join('\n');
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_FORM: Partial<Job> = {
  title: '',
  id: '',
  slug: '',
  location: 'Remote / Hybrid',
  type: 'Full-Time',
  category: 'Engineering',
  shortDescription: '',
  description: '',
  applicationPrompt: '',
  tags: [],
  requirements: [],
  responsibilities: [],
  benefits: [],
  selectionProcess: [],
  preferredExperience: [],
  kpis: [],
  idealCandidate: '',
  duration: 'Full-Time',
  startDate: 'Immediate',
  applicationDeadline: 'Rolling basis',
  postedDate: todayString(),
  status: 'published',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Jobs() {
  const { token, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  // List state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Drawer / form state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<Partial<Job>>({ ...EMPTY_FORM });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  // Dynamically compute all unique categories including presets and DB categories
  const dynamicCategories = Array.from(new Set(jobs.map((j) => j.category).filter(Boolean)));
  const categoryOptions = Array.from(new Set([...PRESET_CATEGORIES, ...dynamicCategories]));

  // ── Auth guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) navigate('/login');
  }, [isAuthenticated, isAdmin, navigate]);

  // ── Fetch jobs ─────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ includeDrafts: 'true', all: 'true' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`${API_CONFIG.ENDPOINTS.JOBS}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) { logout(); navigate('/login'); return; }
      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data = await res.json();
      setJobs(data.success ? data.data : []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate, statusFilter, categoryFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchJobs, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchJobs, search]);

  // ── Filtered + paginated jobs ──────────────────────────────────────────────

  const filteredJobs = jobs;
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const pageJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Drawer helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditingJob(null);
    setForm({ ...EMPTY_FORM, postedDate: todayString() });
    setIsCustomCategory(false);
    setCustomCategoryText('');
    setFormError('');
    setDrawerOpen(true);
  }

  function openEdit(job: Job) {
    setEditingJob(job);
    const isCustom = Boolean(job.category && !PRESET_CATEGORIES.includes(job.category));
    setIsCustomCategory(isCustom);
    setCustomCategoryText(isCustom ? job.category : '');
    setForm({
      ...job,
      tags: job.tags ?? [],
      requirements: job.requirements ?? [],
      responsibilities: job.responsibilities ?? [],
      benefits: job.benefits ?? [],
      selectionProcess: job.selectionProcess ?? [],
      preferredExperience: job.preferredExperience ?? [],
      kpis: job.kpis ?? [],
      idealCandidate: job.idealCandidate ?? '',
    });
    setFormError('');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingJob(null);
    setForm({ ...EMPTY_FORM });
    setIsCustomCategory(false);
    setCustomCategoryText('');
    setFormError('');
  }

  function setField<K extends keyof Job>(key: K, value: Job[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-generate slug from title when creating
      if (key === 'title' && !editingJob) {
        next.slug = toSlug(value as string);
      }
      return next;
    });
  }

  // ── Save (create / update) ─────────────────────────────────────────────────

  async function handleSave() {
    setFormError('');
    if (!form.title?.trim()) { setFormError('Title is required.'); return; }
    if (!form.shortDescription?.trim()) { setFormError('Short description is required.'); return; }
    if (!form.description?.trim()) { setFormError('Full description is required.'); return; }

    const finalCategory = isCustomCategory
      ? (customCategoryText.trim() || 'Other')
      : (form.category || 'Engineering');

    if (isCustomCategory && !customCategoryText.trim()) {
      setFormError('Please enter a custom category name.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        category: finalCategory,
        requirements:        Array.isArray(form.requirements)        ? form.requirements        : splitLines(String(form.requirements        ?? '')),
        responsibilities:    Array.isArray(form.responsibilities)    ? form.responsibilities    : splitLines(String(form.responsibilities    ?? '')),
        benefits:            Array.isArray(form.benefits)            ? form.benefits            : splitLines(String(form.benefits            ?? '')),
        selectionProcess:    Array.isArray(form.selectionProcess)    ? form.selectionProcess    : splitLines(String(form.selectionProcess    ?? '')),
        preferredExperience: Array.isArray(form.preferredExperience) ? form.preferredExperience : splitLines(String(form.preferredExperience ?? '')),
        kpis:                Array.isArray(form.kpis)                ? form.kpis                : splitLines(String(form.kpis                ?? '')),
        idealCandidate:      typeof form.idealCandidate === 'string' ? form.idealCandidate.trim() : '',
        tags:                Array.isArray(form.tags)                ? form.tags                : String(form.tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
      };

      const url = editingJob
        ? API_CONFIG.ENDPOINTS.jobById(editingJob._id)
        : API_CONFIG.ENDPOINTS.JOBS;

      const res = await fetch(url, {
        method: editingJob ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to save job. Please check all required fields.');
        return;
      }

      closeDrawer();
      await fetchJobs();
    } catch (err) {
      console.error('Error saving job:', err);
      setFormError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Status toggle (publish / unpublish / close) ────────────────────────────

  async function handleStatusChange(job: Job, newStatus: JobStatus) {
    setSavingStatusId(job._id);
    try {
      const res = await fetch(API_CONFIG.ENDPOINTS.jobStatus(job._id), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setJobs(prev => prev.map(j => j._id === job._id ? { ...j, status: newStatus, closedDate: data.data?.closedDate ?? j.closedDate } : j));
      }
    } catch (err) {
      console.error('Error changing status:', err);
    } finally {
      setSavingStatusId(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#03045E] leading-tight tracking-tight">Job Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create, edit, and manage all job listings</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#03045E] hover:bg-[#03045E]/90 text-white h-9 px-4 text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add New Job
        </Button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        {(['published', 'draft', 'closed'] as JobStatus[]).map(s => {
          const count = jobs.filter(j => j.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(prev => prev === s ? 'all' : s); setPage(1); }}
              className={cn(
                'rounded-xl border px-4 py-3 text-left transition-all',
                statusFilter === s ? cfg.className + ' ring-2 ring-offset-1' : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{cfg.label}</p>
              <p className="text-2xl font-bold text-[#03045E]">{count}</p>
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by title, ID, category…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(statusFilter !== 'all' || categoryFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setSearch(''); setPage(1); }} className="text-gray-500 h-9">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#03045E]/30" />
            <p className="text-sm text-gray-400">Loading jobs…</p>
          </div>
        ) : pageJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Briefcase className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No jobs found</p>
            <p className="text-xs">Try adjusting filters or add a new job role.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[30%]">Job Title</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageJobs.map(job => (
                <TableRow key={job._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <TableCell className="py-3.5 px-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{job.title}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{job.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <span className="text-sm text-gray-600">{job.category}</span>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                      {job.location}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <span className="text-sm text-gray-600">{job.type}</span>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <Badge className={cn('border text-[11px] font-semibold', STATUS_CONFIG[job.status]?.className)}>
                      {STATUS_CONFIG[job.status]?.label ?? job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(job)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-[#03045E] hover:bg-[#03045E]/5 transition-colors"
                        title="Edit job"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {/* Status quick-toggle */}
                      {savingStatusId === job._id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-1" />
                      ) : job.status === 'published' ? (
                        <>
                          <button
                            onClick={() => handleStatusChange(job, 'draft')}
                            className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Unpublish (set to Draft)"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(job, 'closed')}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Close position"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : job.status === 'draft' ? (
                        <>
                          <button
                            onClick={() => handleStatusChange(job, 'published')}
                            className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Publish job"
                          >
                            <Globe className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(job, 'closed')}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Close position"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(job, 'published')}
                          className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Re-publish job"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length} jobs
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-gray-600 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          Job Drawer (Create / Edit)
      ───────────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Drawer panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#03045E] to-[#0077B6] shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white leading-tight">
                  {editingJob ? 'Edit Job' : 'Add New Job'}
                </h2>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  {editingJob ? `Editing: ${editingJob.id}` : 'Fill in the details to post a new role'}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Basic info ── */}
              <section>
                <SectionTitle icon={<Briefcase className="h-3.5 w-3.5" />} title="Basic Information" />
                <div className="space-y-4 mt-3">

                  <FormField label="Job Title *">
                    <Input
                      placeholder="e.g. Senior AI Engineer"
                      value={form.title ?? ''}
                      onChange={e => setField('title', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Job ID">
                      <Input
                        placeholder="Auto-generated if blank"
                        value={form.id ?? ''}
                        onChange={e => setField('id', e.target.value.toUpperCase())}
                        className="h-9 text-sm font-mono"
                        disabled={!!editingJob}
                      />
                      {!editingJob && <p className="text-[10px] text-gray-400 mt-1">e.g. TV-AI-ENG-2026-012</p>}
                    </FormField>
                    <FormField label="Slug">
                      <Input
                        placeholder="auto-generated-from-title"
                        value={form.slug ?? ''}
                        onChange={e => setField('slug', e.target.value)}
                        className="h-9 text-sm font-mono"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Category *">
                      <div className="space-y-1.5">
                        <Select
                          value={isCustomCategory ? '__custom__' : (form.category ?? 'Engineering')}
                          onValueChange={v => {
                            if (v === '__custom__') {
                              setIsCustomCategory(true);
                              setField('category', customCategoryText || '');
                            } else {
                              setIsCustomCategory(false);
                              setField('category', v);
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Category" /></SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            <SelectItem value="__custom__" className="text-[#0077B6] font-medium">
                              + Add Custom Category…
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {isCustomCategory && (
                          <div className="flex items-center gap-1.5">
                            <Input
                              placeholder="Enter custom category…"
                              value={customCategoryText}
                              onChange={e => {
                                setCustomCategoryText(e.target.value);
                                setField('category', e.target.value);
                              }}
                              className="h-8 text-xs flex-1"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomCategory(false);
                                setField('category', 'Engineering');
                              }}
                              className="px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                            >
                              Preset
                            </button>
                          </div>
                        )}
                      </div>
                    </FormField>
                    <FormField label="Employment Type *">
                      <Select value={form.type ?? 'Full-Time'} onValueChange={v => setField('type', v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Location *">
                      <Select value={form.location ?? 'Remote / Hybrid'} onValueChange={v => setField('location', v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Duration">
                      <Input
                        placeholder="e.g. Full-Time or 3-6 months"
                        value={form.duration ?? ''}
                        onChange={e => setField('duration', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Status">
                      <Select value={form.status ?? 'published'} onValueChange={v => setField('status', v as JobStatus)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Posted Date">
                      <Input
                        type="date"
                        value={form.postedDate ?? todayString()}
                        onChange={e => setField('postedDate', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Start Date">
                      <Input
                        placeholder="e.g. Immediate"
                        value={form.startDate ?? ''}
                        onChange={e => setField('startDate', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </FormField>
                    <FormField label="Application Deadline">
                      <Input
                        placeholder="e.g. Rolling basis"
                        value={form.applicationDeadline ?? ''}
                        onChange={e => setField('applicationDeadline', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </FormField>
                  </div>
                </div>
              </section>

              {/* ── Description ── */}
              <section>
                <SectionTitle icon={<Tag className="h-3.5 w-3.5" />} title="Descriptions" />
                <div className="space-y-4 mt-3">
                  <FormField label="Short Description * (shown on cards)">
                    <Textarea
                      placeholder="One-line summary of the role…"
                      value={form.shortDescription ?? ''}
                      onChange={e => setField('shortDescription', e.target.value)}
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </FormField>
                  <FormField label="Full Description *">
                    <Textarea
                      placeholder="Detailed job description…"
                      value={form.description ?? ''}
                      onChange={e => setField('description', e.target.value)}
                      rows={6}
                      className="text-sm resize-y"
                    />
                  </FormField>
                  <FormField label="Application Prompt">
                    <Textarea
                      placeholder="What to include in the application…"
                      value={form.applicationPrompt ?? ''}
                      onChange={e => setField('applicationPrompt', e.target.value)}
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </FormField>
                  <FormField label="Ideal Candidate (Optional)">
                    <Textarea
                      placeholder="Describe the ideal persona, traits, mindset, or cultural fit for this position…"
                      value={form.idealCandidate ?? ''}
                      onChange={e => setField('idealCandidate', e.target.value)}
                      rows={3}
                      className="text-sm resize-y"
                    />
                  </FormField>
                </div>
              </section>

              {/* ── Lists ── */}
              <section>
                <SectionTitle icon={<CheckCircle className="h-3.5 w-3.5" />} title="Role Details (one item per line)" />
                <div className="space-y-4 mt-3">
                  <FormField label="Requirements">
                    <Textarea
                      placeholder="• Bachelor's degree in Computer Science&#10;• 3+ years of Python experience"
                      value={Array.isArray(form.requirements) ? joinLines(form.requirements) : (form.requirements ?? '')}
                      onChange={e => setField('requirements', splitLines(e.target.value) as any)}
                      rows={5}
                      className="text-sm resize-y font-mono"
                    />
                  </FormField>
                  <FormField label="Preferred Experience (Optional)">
                    <Textarea
                      placeholder="• 2+ years of relevant industry experience&#10;• Experience with modern microservices architectures"
                      value={Array.isArray(form.preferredExperience) ? joinLines(form.preferredExperience) : (form.preferredExperience ?? '')}
                      onChange={e => setField('preferredExperience', splitLines(e.target.value) as any)}
                      rows={4}
                      className="text-sm resize-y font-mono"
                    />
                  </FormField>
                  <FormField label="Responsibilities">
                    <Textarea
                      placeholder="• Design and build AI features&#10;• Collaborate with the product team"
                      value={Array.isArray(form.responsibilities) ? joinLines(form.responsibilities) : (form.responsibilities ?? '')}
                      onChange={e => setField('responsibilities', splitLines(e.target.value) as any)}
                      rows={5}
                      className="text-sm resize-y font-mono"
                    />
                  </FormField>
                  <FormField label="Key Performance Indicators (KPIs) (Optional)">
                    <Textarea
                      placeholder="• Achieve 95%+ sprint delivery milestones&#10;• Maintain 90%+ outreach qualification rate"
                      value={Array.isArray(form.kpis) ? joinLines(form.kpis) : (form.kpis ?? '')}
                      onChange={e => setField('kpis', splitLines(e.target.value) as any)}
                      rows={4}
                      className="text-sm resize-y font-mono"
                    />
                  </FormField>
                  <FormField label="Benefits">
                    <Textarea
                      placeholder="• Competitive salary&#10;• Remote-first culture"
                      value={Array.isArray(form.benefits) ? joinLines(form.benefits) : (form.benefits ?? '')}
                      onChange={e => setField('benefits', splitLines(e.target.value) as any)}
                      rows={4}
                      className="text-sm resize-y font-mono"
                    />
                  </FormField>
                  <FormField label="Selection Process">
                    <Textarea
                      placeholder="• Application review&#10;• Technical interview&#10;• Final round"
                      value={Array.isArray(form.selectionProcess) ? joinLines(form.selectionProcess) : (form.selectionProcess ?? '')}
                      onChange={e => setField('selectionProcess', splitLines(e.target.value) as any)}
                      rows={3}
                      className="text-sm resize-y font-mono"
                    />
                  </FormField>
                </div>
              </section>

              {/* ── Tags ── */}
              <section>
                <SectionTitle icon={<Clock className="h-3.5 w-3.5" />} title="Tags (comma-separated)" />
                <div className="mt-3">
                  <FormField label="Tags">
                    <Input
                      placeholder="e.g. Python, LangChain, RAG, GenAI"
                      value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags ?? '')}
                      onChange={e => setField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean) as any)}
                      className="h-9 text-sm"
                    />
                  </FormField>
                  {Array.isArray(form.tags) && form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.tags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#03045E]/8 text-[#03045E] text-[11px] font-medium">
                          {tag}
                          <button onClick={() => setField('tags', (form.tags as string[]).filter((_, idx) => idx !== i) as any)} className="hover:text-red-500 leading-none">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 shrink-0">
              {formError && (
                <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={closeDrawer} disabled={saving} className="h-9 px-4 text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#03045E] hover:bg-[#03045E]/90 text-white h-9 px-5 text-sm font-medium"
                >
                  {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Saving…</> : editingJob ? 'Save Changes' : 'Create Job'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
      <span className="text-[#0077B6]">{icon}</span>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
    </div>
  );
}
