import { useEffect, useState } from 'react';
import { assignTeamMembers, getUsers, registerUser } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';

const ROLE_LABELS = {
  employee: 'Employee',
  team_leader: 'Team Leader',
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
  const [teamAssignments, setTeamAssignments] = useState({});

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

  const handleSyncTeam = async (leaderId) => {
    await assignTeamMembers(leaderId, teamAssignments[leaderId] ?? []);
    load();
  };

  const updateTeamSelection = (leaderId, teammateId, checked) => {
    setTeamAssignments((prev) => {
      const current = prev[leaderId] ?? [];
      const next = checked
        ? Array.from(new Set([...current, teammateId]))
        : current.filter((id) => id !== teammateId);
      return { ...prev, [leaderId]: next };
    });
  };

  const roleBadge = (role) => {
    if (role === 'admin') return 'badge-blue';
    if (role === 'manager') return 'badge-amber';
    if (role === 'team_leader') return 'badge-green';
    return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Menaxho punonjësit, team leaders, menaxherët dhe office manager-in"
        action={
          <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary">
            Add User
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 grid gap-4 p-6 sm:grid-cols-2">
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
            <option value="employee">Employee - rezervon vetem per vete</option>
            <option value="team_leader">Team Leader - bookon per ekipin</option>
            <option value="manager">Manager - analytics + rezervime</option>
            <option value="admin">Office Manager - menaxhon gjithcka</option>
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
              <th className="px-4 py-3">Team</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3.5 font-medium">{u.full_name}</td>
                <td className="px-4 py-3.5 text-slate-600">{u.job_title ?? '—'}</td>
                <td className="px-4 py-3.5 text-slate-600">{u.email}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge(u.role)}`}
                  >
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {u.role === 'team_leader' ? (
                    <div className="space-y-2">
                      <div className="max-h-28 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs">
                        {users
                          .filter((candidate) => candidate.role === 'employee')
                          .map((candidate) => (
                            <label
                              key={candidate.id}
                              className="flex items-center gap-2 py-1 text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={(teamAssignments[u.id] ?? []).includes(candidate.id)}
                                onChange={(e) =>
                                  updateTeamSelection(u.id, candidate.id, e.target.checked)
                                }
                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                              />
                              {candidate.full_name}
                            </label>
                          ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSyncTeam(u.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Sync team
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
