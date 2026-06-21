import { useEffect, useMemo, useState } from 'react';
import {
  assignTeamMembers,
  deleteUser,
  downloadUsersCsv,
  getUsers,
  registerUser,
  updateUser,
} from '../../api/client';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import { formatApiError } from '../../lib/apiError';
import {
  emailDomainHint,
  emailValidationError,
} from '../../lib/email';

const ROLE_LABELS = {
  employee: 'Employee',
  team_leader: 'Team Leader',
  admin: 'Office Manager',
};

const TEAM_NAMES = ['Product', 'Operations', 'Platform', 'Engineering', 'Design'];

const EMPTY_FORM = {
  email: '',
  full_name: '',
  job_title: '',
  role: 'employee',
  team_name: '',
};

function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [teamAssignments, setTeamAssignments] = useState({});
  const [leaderTeamNames, setLeaderTeamNames] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdPassword, setCreatedPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const employees = useMemo(
    () => users.filter((user) => user.role === 'employee'),
    [users],
  );

  const load = () => getUsers().then((data) => {
    setUsers(data);
    const assignments = {};
    const teamNames = {};
    data.forEach((user) => {
      if (user.role === 'team_leader') {
        teamNames[user.id] = user.team_name ?? '';
        assignments[user.id] = data
          .filter((candidate) => candidate.team_leader_id === user.id)
          .map((candidate) => candidate.id);
      }
    });
    setTeamAssignments(assignments);
    setLeaderTeamNames(teamNames);
  });

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingUserId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreatedPassword('');
    if (!editingUserId) {
      const emailError = emailValidationError(form.email);
      if (emailError) {
        setError(emailError);
        return;
      }
    }

    try {
      if (editingUserId) {
        await updateUser(editingUserId, {
          full_name: form.full_name,
          role: form.role,
          job_title: form.job_title || undefined,
          team_name: form.role === 'team_leader' ? form.team_name || undefined : undefined,
        });
        setSuccess('User updated successfully.');
      } else {
        const created = await registerUser({
          email: form.email.trim().toLowerCase(),
          full_name: form.full_name,
          role: form.role,
          job_title: form.job_title || undefined,
          team_name: form.role === 'team_leader' ? form.team_name || undefined : undefined,
        });
        setCreatedPassword(created.temporary_password || '');
        setSuccess('User created successfully.');
      }
      resetForm();
      load();
    } catch (err) {
      setError(formatApiError(err, 'Could not save user.'));
    }
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setForm({
      email: user.email,
      full_name: user.full_name,
      job_title: user.job_title ?? '',
      role: user.role,
      team_name: user.team_name ?? '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
    setCreatedPassword('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await deleteUser(deleteTarget.id);
      setSuccess(`${deleteTarget.full_name} was deleted.`);
      if (editingUserId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(String(err?.response?.data?.detail ?? 'Could not delete user.'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSyncTeam = async (leaderId) => {
    setError('');
    setSuccess('');
    try {
      await assignTeamMembers(
        leaderId,
        teamAssignments[leaderId] ?? [],
        leaderTeamNames[leaderId] || undefined,
      );
      setSuccess('Team updated successfully.');
      load();
    } catch (err) {
      setError(String(err?.response?.data?.detail ?? 'Could not update team.'));
    }
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
        action={(
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                const blob = await downloadUsersCsv();
                saveBlob(blob, 'deskdibs-users.csv');
              }}
              className="btn-secondary"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="btn-primary"
            >
              Add user
            </button>
          </div>
        )}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
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
            Share this password with the user if email is not configured.
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
            placeholder={`Email (name.surname${emailDomainHint()})`}
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
            className="input-field"
          >
            <option value="employee">Employee</option>
            <option value="team_leader">Team Leader</option>
            <option value="admin">Office Manager</option>
          </select>
          {form.role === 'team_leader' && (
            <select
              value={form.team_name}
              onChange={(e) => setForm({ ...form, team_name: e.target.value })}
              className="input-field sm:col-span-2"
            >
              <option value="">Select team name</option>
              {TEAM_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
          {!editingUserId && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500 sm:col-span-2">
              Only company emails ending with {emailDomainHint()} are allowed.
            </div>
          )}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" className="btn-primary">
              {editingUserId ? 'Save changes' : 'Create user'}
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

      <div className="card overflow-x-auto">
        <table className="min-w-[860px] w-full text-sm">
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
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge(u.role)}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {u.role === 'team_leader' ? (
                    <div className="space-y-2">
                      <select
                        value={leaderTeamNames[u.id] ?? ''}
                        onChange={(e) =>
                          setLeaderTeamNames((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      >
                        <option value="">Team name</option>
                        {TEAM_NAMES.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <div className="max-h-28 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs">
                        {employees.map((candidate) => (
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
                            <span>{candidate.full_name}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSyncTeam(u.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Save team
                      </button>
                    </div>
                  ) : u.team_leader_id ? (
                    <span className="text-slate-600">{u.team_name ?? 'Assigned team'}</span>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
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
                      onClick={() => setDeleteTarget(u)}
                      disabled={u.email === 'sarah.chen@genpact.com'}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user?"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.full_name}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete user"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
