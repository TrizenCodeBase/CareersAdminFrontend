/** Job IDs and titles — keep in sync with TrizenCareersBackend jobRegistry. */

export interface JobOption {
  id: string;
  title: string;
}

export const JOB_TITLES: Record<string, string> = {
  'TV-AIML-INT-2025-001': 'AIML Intern',
  'TV-AIML-INT-2026-001': 'AIML Intern',
  'TV-AI-GEN-2026-009': 'AI Engineer – GenAI & Multi-Agent Systems (3-Month Contract)',
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
  'TV-SLS-BDE-2026-009': 'Business Development Executive – IT Services',
  'TV-SLS-HOT-2026-010': 'Telecalling & Outreach Intern',
  'TV-MKT-SDMH-2026-011': 'Social Media & Digital Marketing Intern – Healthcare',
};

export const dynamicJobTitles: Record<string, string> = {};

export function registerJobTitle(id: string, title: string) {
  if (id && title) {
    dynamicJobTitles[id] = title;
  }
}

export const JOB_OPTIONS: JobOption[] = Object.entries(JOB_TITLES).map(([id, title]) => ({
  id,
  title,
}));

export function getAllJobOptions(): JobOption[] {
  const optionsMap = new Map<string, string>();
  Object.entries(JOB_TITLES).forEach(([id, title]) => optionsMap.set(id, title));
  Object.entries(dynamicJobTitles).forEach(([id, title]) => optionsMap.set(id, title));
  return Array.from(optionsMap.entries()).map(([id, title]) => ({ id, title }));
}

export function getJobTitle(jobId?: string | null): string {
  if (!jobId) return 'N/A';
  return JOB_TITLES[jobId] || dynamicJobTitles[jobId] || jobId;
}

/** Groups openings that are the same role family across years/codes (e.g. all MERN). */
export function getRoleFamily(jobId?: string | null): string {
  if (!jobId) return '';
  if (jobId.includes('WEB-MERN')) return 'mern';
  if (jobId.includes('AIML-INT')) return 'aiml';
  if (jobId.includes('AI-AUT')) return 'ai-aut';
  if (jobId.includes('AI-GEN')) return 'ai-gen';
  if (jobId.includes('AI-FS')) return 'ai-fs';
  if (jobId.includes('MKT-SMM')) return 'smm';
  if (jobId.includes('MKT-CSM') || jobId.includes('MKT-SDMH')) return 'csm';
  if (jobId.includes('MKT-GM')) return 'growth';
  if (jobId.includes('SLS-BDE')) return 'bde';
  if (jobId.includes('SLS-HOT')) return 'hot';
  return jobId;
}

export function isSameRoleFamily(a?: string | null, b?: string | null): boolean {
  const fa = getRoleFamily(a);
  const fb = getRoleFamily(b);
  return Boolean(fa && fb && fa === fb);
}

export function getRoleFamilyLabel(jobId?: string | null): string {
  const family = getRoleFamily(jobId);
  switch (family) {
    case 'mern':
      return 'MERN / Full Stack';
    case 'aiml':
      return 'AIML Intern';
    case 'ai-aut':
      return 'AI & Automation';
    case 'ai-gen':
      return 'GenAI & Multi-Agent';
    case 'ai-fs':
      return 'AI & Automation Intern';
    case 'smm':
      return 'Social Media Management';
    case 'csm':
      return 'Content & Social Media';
    case 'growth':
      return 'Growth Marketing';
    case 'bde':
      return 'Business Development';
    case 'hot':
      return 'Telecalling & Outreach';
    default:
      return getJobTitle(jobId);
  }
}
