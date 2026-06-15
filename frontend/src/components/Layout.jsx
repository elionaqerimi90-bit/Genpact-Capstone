import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Map,
  Search,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const employeeLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reservations', icon: Calendar, label: 'My Reservations' },
  { to: '/floor-plan', icon: Map, label: 'Floor Plan' },
];

const managerLinks = [
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Admin Dashboard' },
  { to: '/admin/resources', icon: Building2, label: 'Resources' },
  { to: '/admin/builder', icon: Map, label: 'Floor Builder' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function Layout() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="flex w-[260px] shrink-0 flex-col bg-brand-900 text-white">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold shadow-lg">
              D
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">DeskDibs</span>
              <p className="text-[11px] text-brand-200">Hot-desking platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
            Workspace
          </p>
          {employeeLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-brand-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}

          {isManager && !isAdmin && (
            <>
              <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
                Management
              </p>
              {managerLinks.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'text-brand-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {label}
                </NavLink>
              ))}
            </>
          )}

          {isAdmin && (
            <>
              <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
                Administration
              </p>
              {adminLinks.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'text-brand-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold">
              {user?.full_name?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.full_name}</p>
              <p className="truncate text-xs text-brand-300">
                {user?.job_title ?? user?.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-200 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-6 py-3.5 shadow-sm">
          <div className="relative max-w-md flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search desks, rooms, colleagues…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/10"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Building2 size={16} className="text-brand-600" />
              HQ — New York
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            <button
              type="button"
              className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            >
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              {isAdmin && <span className="badge-blue">Admin</span>}
              {isManager && !isAdmin && <span className="badge-amber">Manager</span>}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
                <p className="text-xs text-slate-500">{user?.job_title ?? user?.role}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white ring-2 ring-brand-100">
                {user?.full_name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
