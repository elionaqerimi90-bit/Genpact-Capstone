import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Armchair,
  Map,
  Menu,
  Search,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRecentActivity, searchWorkspace } from '../api/client';
import BrandMark from './BrandMark';

const employeeLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reservations', icon: Calendar, label: 'My Reservations' },
  { to: '/floor-plan', icon: Armchair, label: 'Reserve Seat' },
];

const managerLinks = [
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Admin Dashboard' },
  { to: '/admin/reservations', icon: Calendar, label: 'Reservations' },
  { to: '/admin/resources', icon: Building2, label: 'Resources' },
  { to: '/admin/builder', icon: Map, label: 'Floor Builder' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/profile', icon: UserCircle2, label: 'Profile' },
];

export default function Layout() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ resources: [], users: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileLinks = [
    ...employeeLinks,
    ...(isManager && !isAdmin ? managerLinks : []),
    ...(isAdmin ? adminLinks : []),
  ];

  useEffect(() => {
    getRecentActivity().then(setRecentActivity).catch(() => setRecentActivity([]));
  }, [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const loadRecentActivity = () => {
      getRecentActivity().then(setRecentActivity).catch(() => setRecentActivity([]));
    };

    loadRecentActivity();
    const intervalId = window.setInterval(loadRecentActivity, 5000);

    return () => window.clearInterval(intervalId);
  }, [notificationsOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults({ resources: [], users: [] });
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      searchWorkspace(query)
        .then((data) => {
          setSearchResults({
            resources: data.resources ?? [],
            users: data.users ?? [],
          });
          setSearchOpen(true);
        })
        .catch(() => setSearchResults({ resources: [], users: [] }));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSearch = () => {
    setSearchOpen(false);
  };

  const handleResourceOpen = (resource) => {
    const params = new URLSearchParams({
      resourceId: String(resource.id),
      floor: resource.floor,
      type: resource.type,
    });
    navigate(`/floor-plan?${params.toString()}`);
    setSearchQuery('');
    setSearchResults({ resources: [], users: [] });
    closeSearch();
  };

  const hasSearchResults =
    searchResults.resources.length > 0 || searchResults.users.length > 0;

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-[260px] shrink-0 flex-col bg-brand-900 text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <BrandMark showWordmark />
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
            <NavLink
              to="/profile"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold"
              aria-label="Profile"
            >
              {user?.profile_image_path ? (
                <img src={user.profile_image_path} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.full_name?.charAt(0)
              )}
            </NavLink>
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
        <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:py-3.5">
          <div className="flex w-full items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white shadow">
                D
              </div>
              <div>
                <p className="text-sm font-bold leading-tight text-slate-900">DeskDibs</p>
                <p className="text-[10px] text-slate-500">Hot-desking platform</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={16} />
              Menu
            </button>
          </div>

          <div className="relative w-full flex-1 sm:max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search desks, rooms, colleagues..."
              value={searchQuery}
              onFocus={() => {
                if (hasSearchResults) setSearchOpen(true);
              }}
              onBlur={() => {
                window.setTimeout(() => closeSearch(), 150);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!searchOpen) setSearchOpen(true);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/10"
            />
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                {hasSearchResults ? (
                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {searchResults.resources.length > 0 && (
                      <div>
                        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Desks & Rooms
                        </p>
                        {searchResults.resources.map((resource) => (
                          <button
                            key={`resource-${resource.id}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleResourceOpen(resource)}
                            className="flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">{resource.name}</p>
                              <p className="text-xs text-slate-500">
                                Floor {resource.floor} - {resource.zone} - {resource.type}
                              </p>
                            </div>
                            <span className="mt-0.5 rounded-full bg-brand-50 px-2 py-1 text-[11px] font-medium capitalize text-brand-700">
                              {resource.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.users.length > 0 && (
                      <div className="mt-1">
                        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Colleagues
                        </p>
                        {searchResults.users.map((person) => (
                          <div
                            key={`user-${person.id}`}
                            className="rounded-xl px-3 py-2.5"
                          >
                            <p className="text-sm font-medium text-slate-900">{person.full_name}</p>
                            <p className="text-xs text-slate-500">
                              {person.email} · {person.job_title || person.role}
                            </p>
                            {person.team_name && (
                              <p className="text-xs text-slate-400">Team: {person.team_name}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    No matching desks, rooms, or colleagues found.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Building2 size={16} className="text-brand-600" />
              HQ - Prishtina
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              >
                <Bell size={18} />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-20 w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, index) => (
                        <div
                          key={`${activity}-${index}`}
                          className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        >
                          {activity}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                        No recent activity yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              {isAdmin && <span className="badge-blue">Admin</span>}
              {isManager && !isAdmin && <span className="badge-amber">Manager</span>}
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
                <p className="text-xs text-slate-500">{user?.job_title ?? user?.role}</p>
              </div>
              <NavLink
                to="/profile"
                className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-brand-600 text-sm font-semibold text-white ring-2 ring-brand-100"
                aria-label="Profile"
              >
                {user?.profile_image_path ? (
                  <img
                    src={user.profile_image_path}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.full_name?.charAt(0)
                )}
              </NavLink>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-5 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu backdrop"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,320px)] flex-col bg-brand-900 text-white shadow-2xl transition-transform duration-200 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <BrandMark showWordmark />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg border border-white/10 p-2 text-brand-100 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-white/10 p-4">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3"
          >
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold">
              {user?.profile_image_path ? (
                <img src={user.profile_image_path} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.full_name?.charAt(0)
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user?.full_name}</span>
              <span className="block truncate text-xs text-brand-300">
                {user?.job_title ?? user?.role}
              </span>
            </span>
          </NavLink>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {mobileLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-brand-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.9} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-brand-200 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}
