import { useEffect, useState } from 'react';
import { getMe, updateMe } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    current_password: '',
    new_password: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({ ...prev, full_name: user.full_name || '' }));
    setPreview(user.profile_image_path || '');
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const body = new FormData();
    body.append('full_name', form.full_name);
    if (form.current_password) body.append('current_password', form.current_password);
    if (form.new_password) body.append('new_password', form.new_password);
    if (profileImage) body.append('profile_image', profileImage);

    const updated = await updateMe(body);
    setMessage('Profile updated successfully.');
    setForm({ full_name: updated.full_name, current_password: '', new_password: '' });
    setProfileImage(null);
    setPreview(updated.profile_image_path || '');
    if (refreshUser) await refreshUser();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Profile"
        subtitle="Edit your name, password, and profile picture"
      />

      <div className="card p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-2xl font-bold text-white">
            {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : user?.full_name?.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user?.full_name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
            <input
              className="input-field"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Profile picture</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="input-field py-2"
              onChange={(e) => setProfileImage(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Current password
            </label>
            <input
              type="password"
              className="input-field"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              className="input-field"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            />
          </div>

          {message && (
            <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" className="btn-primary">
              Save profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
