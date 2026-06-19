import { useEffect, useMemo, useState } from 'react';
import {
  assignTeamMembers,
  deleteUser,
  getUsers,
  registerUser,
  updateUser,
} from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';

const ROLE_LABELS = {
  employee: 'Employee',
  team_leader: 'Team Leader',
  admin: 'Office Manager',
};

const EMPTY_FORM = {
  email: '',
  full_name: '',
  job_title: '',
  role: 'employee',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [teamAssignments, setTeamAssignments] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [createdPassword, setCreatedPassword] = useState('');

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingUserId) ?? null,
    [users, editingUserId]
  );

  const load = () => getUsers().then(setUsers);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editingUser) return;
    setForm({
      email: editingUser.email,
      full_name: editingUser.full_name,
      job_title: editingUser.job_title ?? '',
      role: editingUser.role,
    });
    setShowForm(true);
  }, [editingUser]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingUserId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setCreatedPassword('');
    const payload = {
      full_name: form.full_name,
      job_title: form.job_title || undefined,
      role: form.role,
    };

    if (editingUserId) {
      await updateUser(editingUserId, payload);
      setFeedback({ type: 'success', text: 'User updated successfully.' });
    } else {
      const created = await registerUser({
        ...form,
        job_title: form.job_title || undefined,
      });
      setCreatedPassword(created.temporary_password || '');
      setFeedback({
        type: 'success',
        text: 'User created successfully.',
      });
    }

    resetForm();
    load();
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.full_name}? This cannot be undone.`)) return;
    setFeedback(null);
    await deleteUser(user.id);
    setFeedback({ type: 'success', text: 'User deleted.' });
    if (editingUserId === user.id) resetForm();
    load();
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setForm({
      email: user.email,
      full_name: user.full_name,
      job_title: user.job_title ?? '',
      role: user.role,
    });
    setShowForm(true);
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
        subtitle="Manage employees and access roles"
        action={
          <button
            type="button"
            onClick={() => {
              setEditingUserId(null);
              setForm(EMPTY_FORM);
              setShowForm(!showForm);
            }}
            className="btn-primary"
          >
            Add User
          </button>
        }
      />

      {feedback && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {createdPassword && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 text-sm text-brand-900">
          <p className="font-semibold">Temporary password</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-white px-3 py-2 text-sm font-semibold tracking-wide text-slate-900 shadow-sm">
              {createdPassword}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(createdPassword)}
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              Copy password
            </button>
          </div>
          <p className="mt-2 text-xs text-brand-700">
            Share this password with the user so they can sign in and change it on first login.
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 grid gap-4 p-6 sm:grid-cols-2">
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input-field"
            required
          />
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-field"
            required
            disabled={Boolean(editingUserId)}
          />
          <input
            placeholder="Job title"
            value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            className="input-field"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input-field sm:col-span-2"
          >
            <option value="employee">Employee</option>
            <option value="team_leader">Team Leader</option>
            <option value="admin">Office Manager</option>
          </select>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn-primary">
              {editingUserId ? 'Save Changes' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
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
              <th className="px-4 py-3">Actions</th>
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
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(u)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      disabled={u.role === 'admin' && u.email === 'sarah.chen@genpact.com'}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
