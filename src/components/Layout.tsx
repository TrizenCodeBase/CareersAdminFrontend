import { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, FileText, Mail, Upload, ChevronRight, Briefcase, Trash2 } from 'lucide-react';
import trizenLogo from '../../assets/trizenlogo.png';

interface LayoutProps {
  children: ReactNode;
}

/** Derive a human-readable page title from a pathname segment */
function segmentLabel(segment: string): string {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAdmin) {
    return null;
  }

  const navItem = (
    to: string,
    label: string,
    icon: ReactNode,
    exact = true
  ) => {
    const isActive = exact
      ? location.pathname === to
      : location.pathname === to || (
        location.pathname.startsWith(to + '/') &&
        !(to === '/applications' && location.pathname === '/applications/bin')
      );

    return (
      <Link
        to={to}
        className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-brand-primary/10 text-brand-primary border-l-[3px] border-brand-primary pl-[13px]'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-[3px] border-transparent pl-[13px]'
        }`}
      >
        <span className={`shrink-0 ${isActive ? 'text-brand-primary' : 'text-gray-400 group-hover:text-gray-600'}`}>
          {icon}
        </span>
        <span>{label}</span>
      </Link>
    );
  };

  const userInitial = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : '?';

  // Build breadcrumb segments from pathname
  const segments = location.pathname.split('/').filter(Boolean);

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-[2px_0_8px_0_rgba(0,0,0,0.04)] flex flex-col">

        {/* Brand area — subtle gradient */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 bg-gradient-to-br from-[#03045E] to-[#0077B6]">
          <div className="min-w-0">
            <img src={trizenLogo} alt="Trizen" className="h-8 w-36 object-contain object-left" />
            <p className="mt-1 text-[11px] leading-tight text-blue-200">Careers Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Main
          </p>
          {navItem('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
          {navItem('/applications', 'Applications', <FileText className="h-4 w-4" />, false)}
          {navItem('/applications/bin', 'Bin', <Trash2 className="h-4 w-4" />)}
          {navItem('/jobs', 'Job Management', <Briefcase className="h-4 w-4" />)}

          <div className="my-3 border-t border-gray-100" />

          <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Communication
          </p>
          {navItem('/email-notifications', 'Email Notifications', <Mail className="h-4 w-4" />)}
          {navItem('/bulk-email-upload', 'Bulk Email Upload', <Upload className="h-4 w-4" />)}
        </nav>

        {/* Pinned user + logout footer */}
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
              <span className="text-brand-primary text-sm font-semibold leading-none">{userInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5">Administrator</p>
            </div>
            {/* Logout button with tooltip */}
            <div className="relative group/logout shrink-0">
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-[11px] whitespace-nowrap opacity-0 group-hover/logout:opacity-100 transition-opacity duration-150 shadow-md">
                Logout
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 min-h-screen">

        {/* Top navigation bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 h-14">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm text-gray-500">
              <span className="text-gray-400">Home</span>
              {segments.map((seg, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                  <span className={idx === segments.length - 1 ? 'font-semibold text-[#03045E]' : 'text-gray-500'}>
                    {segmentLabel(seg)}
                  </span>
                </span>
              ))}
            </nav>

            {/* Right side — date + admin name */}
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-xs text-gray-400 font-medium">{formattedDate}</span>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-primary/10 flex items-center justify-center">
                  <span className="text-brand-primary text-xs font-bold leading-none">{userInitial}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
