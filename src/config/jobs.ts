/** Job IDs and titles — keep in sync with TrizenCareersBackend jobRegistry. */

export interface JobOption {
  id: string;
  title: string;
}

export const JOB_TITLES: Record<string, string> = {
  'TV-AIML-INT-2025-001': 'AIML Intern',
  'TV-AIML-INT-2026-001': 'AIML Intern',
  'TV-AI-AUT-2026-001': 'Associate AI & Automation Engineer',
  'TV-AI-FS-2026-002': 'AI & Automation Engineer Intern',
  'TV-WEB-MERN-2025-005': 'MERN Stack Developer Intern',
  'TV-WEB-MERN-2025-002': 'MERN Stack Developer Intern',
  'TV-WEB-MERN-2026-005': 'MERN Stack Developer Intern',
  'TV-WEB-MERN-2026-002': 'MERN Stack Developer Intern',
  'TV-WEB-MERN-2026-007': 'Full Stack Developer (MERN + React Native)',
  'TV-WEB-MERN-2026-008': 'Full Stack Developer Intern (MERN + React Native)',
  'TV-MKT-SMM-2025-003': 'Social Media Management Intern',
  'TV-MKT-SMM-2026-003': 'Social Media Management Intern',
  'TV-MKT-GME-2026-003': 'Growth Marketing Executive',
  'TV-MKT-CSM-2026-004': 'Content & Social Media Executive',
  'TV-MKT-GMI-2026-005': 'Growth Marketing Intern',
  'TV-MKT-CSMI-2026-006': 'Content & Social Media Intern',
};

export const JOB_OPTIONS: JobOption[] = Object.entries(JOB_TITLES).map(([id, title]) => ({
  id,
  title,
}));

export function getJobTitle(jobId?: string | null): string {
  if (!jobId) return 'N/A';
  return JOB_TITLES[jobId] || jobId;
}
