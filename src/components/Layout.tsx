import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, FileText, User, Mail, Upload } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      : location.pathname === to || location.pathname.startsWith(to + '/');

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-[2px_0_8px_0_rgba(0,0,0,0.04)] flex flex-col">

        {/* Brand area */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold leading-none">T</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Trizen Careers</p>
            <p className="text-[11px] text-gray-400 leading-tight mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Main
          </p>
          {navItem('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
          {navItem('/applications', 'Applications', <FileText className="h-4 w-4" />, false)}

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
            <button
              onClick={handleLogout}
              title="Logout"
              className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
