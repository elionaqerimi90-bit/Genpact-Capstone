import { useEffect, useState } from 'react';
import { getUsers, registerUser } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';

const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Office Manager (Admin)',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    job_title: '',
    role: 'employee',
  });
  const [showForm, setShowForm] = useState(false);

  const load = () => getUsers().then(setUsers);
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await registerUser({
      ...form,
      job_title: form.job_title || undefined,
    });
    setForm({
      email: '',
      password: '',
      full_name: '',
      job_title: '',
      role: 'employee',
    });
    setShowForm(false);
    load();
  };

  const roleBadge = (role) => {
    if (role === 'admin') return 'badge-blue';
    if (role === 'manager') return 'badge-amber';
    return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Menaxho punonjësit, menaxherët dhe office manager-in"
        action={
          <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary">
            Add User
          </button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card mb-6 grid gap-4 p-6 sm:grid-cols-2"
        >
          <input
            placeholder="Full name (e.g. Ana Gashi)"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input-field"
            required
          />
          <input
            type="email"
            placeholder="Email (emer.mbiemer@genpact.com)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-field"
            required
          />
          <input
            placeholder="Job title (e.g. Senior Manager)"
            value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            className="input-field"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input-field"
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input-field sm:col-span-2"
          >
            <option value="employee">Employee — rezervon vetem per vete</option>
            <option value="manager">Manager — analytics + rezervime</option>
            <option value="admin">Office Manager — menaxhon gjithcka</option>
          </select>
          <button type="submit" className="btn-primary sm:col-span-2">
            Create User
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3.5 font-medium">{u.full_name}</td>
                <td className="px-4 py-3.5 text-slate-600">{u.job_title ?? '—'}</td>
                <td className="px-4 py-3.5 text-slate-600">{u.email}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge(u.role)}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
