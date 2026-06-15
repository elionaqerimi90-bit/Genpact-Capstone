import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  createResource,
  deleteResource,
  getResources,
  updateResource,
} from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';

const emptyForm = {
  name: '',
  type: 'desk',
  floor: '1',
  zone: 'Open Area',
  capacity: 1,
  desk_type: 'Hot Desk',
  amenities: '',
};

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => getResources().then(setResources);
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) {
      await updateResource(editing, form);
      setEditing(null);
    } else {
      await createResource(form);
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const handleEdit = (r) => {
    setForm({
      name: r.name,
      type: r.type,
      floor: r.floor,
      zone: r.zone,
      capacity: r.capacity,
      desk_type: r.desk_type ?? '',
      amenities: r.amenities ?? '',
    });
    setEditing(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this resource? Active bookings will be flagged.')) return;
    await deleteResource(id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Resource Inventory"
        subtitle="Manage desks and meeting rooms grouped by floor and zone"
        action={
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setForm(emptyForm);
          }}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} />
          Add Resource
        </button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          <input
            placeholder="Name (e.g. Desk A-15)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="desk">Desk</option>
            <option value="room">Room</option>
          </select>
          <input
            placeholder="Floor"
            value={form.floor}
            onChange={(e) => setForm({ ...form, floor: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Zone"
            value={form.zone}
            onChange={(e) => setForm({ ...form, zone: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Desk type"
            value={form.desk_type}
            onChange={(e) => setForm({ ...form, desk_type: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Capacity"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            min={1}
          />
          <input
            placeholder="Amenities (comma-separated)"
            value={form.amenities}
            onChange={(e) => setForm({ ...form, amenities: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
            >
              {editing ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Floor</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Desk Type</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 capitalize">{r.type}</td>
                <td className="px-4 py-3">{r.floor}</td>
                <td className="px-4 py-3">{r.zone}</td>
                <td className="px-4 py-3">{r.desk_type ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(r)}
                      className="text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
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
