import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OFFICE_HERO } from '../lib/constants';

export default function Login() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const quickLogin = async (email, label, destination) => {
    setError('');
    setSubmitting(true);
    try {
      await login(email, 'password123');
      navigate(destination);
    } catch {
      setError(`Could not sign in as ${label} right now. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { user } = await login(email, password);
      navigate(user?.role === 'admin' ? '/admin' : '/reservations');
    } catch {
      setError('Incorrect email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[52%] overflow-hidden lg:block">
        <img src={OFFICE_HERO} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/90 via-brand-800/85 to-brand-700/80" />
        <div className="absolute inset-0 flex flex-col justify-center px-14 text-white">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <span className="text-xl font-bold">D</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">DeskDibs</span>
          </div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">
            Workplace flexibility that works for you
          </h2>
          <ul className="mt-8 space-y-4 text-brand-100">
            {[
              'Smart desk reservations',
              'Real-time availability',
              'Seamless workspace experience',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-white px-8 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">
              D
            </div>
            <span className="text-xl font-bold">DeskDibs</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-slate-500">Sign in to manage your workspace bookings</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                />
                Remember me
              </label>
              <button type="button" className="font-medium text-brand-600 hover:text-brand-700">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  quickLogin('sarah.chen@genpact.com', 'Admin', '/admin')
                }
                disabled={submitting}
                className="btn-secondary w-full py-3"
              >
                Login as Admin
              </button>

              <button
                type="button"
                onClick={() =>
                  quickLogin('priya.sharma@genpact.com', 'Manager', '/admin/analytics')
                }
                disabled={submitting}
                className="btn-secondary w-full py-3"
              >
                Login as Manager
              </button>

              <button
                type="button"
                onClick={() =>
                  quickLogin('jane.smith@genpact.com', 'Employee', '/reservations')
                }
                disabled={submitting}
                className="btn-secondary w-full py-3"
              >
                Login as Employee
              </button>

              <button
                type="button"
                onClick={() =>
                  quickLogin('alex.morgan@genpact.com', 'Team Leader', '/reservations')
                }
                disabled={submitting}
                className="btn-secondary w-full py-3"
              >
                Login as Team Leader
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
