import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Trash2, Upload, X } from 'lucide-react';
import {
  createResource,
  deleteFloorPlan,
  getFloorPlans,
  getResources,
  updateFloorPlan,
  updateResourcePosition,
  uploadFloorPlan,
} from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';

const emptyPlanForm = {
  building: 'HQ - Prishtina',
  floor: '1',
};

const emptyResourceForm = {
  name: '',
  type: 'desk',
  building: 'HQ - Prishtina',
  floor: '',
  zone: 'Open Area',
  capacity: 1,
  desk_type: 'Hot Desk',
  amenities: '',
};

export default function FloorBuilder() {
  const [floor, setFloor] = useState('');
  const [resources, setResources] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [creatingResource, setCreatingResource] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingResource, setSavingResource] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    getFloorPlans()
      .then((data) => {
        const sorted = data.slice().sort((a, b) => a.floor.localeCompare(b.floor, undefined, { numeric: true }));
        setPlans(sorted);
        if (sorted.length) {
          setFloor(sorted[0].floor);
        } else {
          setPlanForm(emptyPlanForm);
        }
      })
      .catch(() => setMessage('Could not load floor plans right now.'));
  }, []);

  useEffect(() => {
    if (!floor) {
      setResources([]);
      return;
    }

    getResources({ floor }).then(setResources).catch(() => setResources([]));
  }, [floor]);

  const plan = plans.find((item) => item.floor === floor) ?? null;
  const headerTitle = plan ? `Floor Plan Builder - Floor ${plan.floor}` : 'Floor Plan Builder';
  const headerSubtitle = plan
    ? `Upload, rename, replace, and manage the ${plan.building} floor plan while positioning resources`
    : 'Upload, rename, replace, and manage HQ floor plans while positioning resources';

  useEffect(() => {
    if (!floor) return;
    setResourceForm((current) => ({
      ...current,
      floor: current.floor || floor,
      building: current.building || plan?.building || 'HQ - Prishtina',
    }));
  }, [floor, plan]);

  useEffect(() => {
    if (editingPlanId) return;
    if (plan) {
      setPlanForm({ building: plan.building, floor: plan.floor });
    } else if (floor) {
      setPlanForm((prev) => ({ ...prev, floor }));
    }
  }, [plan, floor, editingPlanId]);

  const floorOptions = useMemo(
    () =>
      [...new Set(plans.map((item) => item.floor).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [plans],
  );

  const reloadPlans = async () => {
    const data = await getFloorPlans();
    const sorted = data.slice().sort((a, b) => a.floor.localeCompare(b.floor, undefined, { numeric: true }));
    setPlans(sorted);
    return sorted;
  };

  const startEditingPlan = (selectedPlan) => {
    setSelectedPlanId(selectedPlan.id);
    setEditingPlanId(selectedPlan.id);
    setPlanForm({ building: selectedPlan.building, floor: selectedPlan.floor });
    setFloor(selectedPlan.floor);
    setMessage('');
  };

  const cancelEditingPlan = () => {
    setEditingPlanId(null);
    setSelectedPlanId(null);
    if (plan) {
      setPlanForm({ building: plan.building, floor: plan.floor });
    } else {
      setPlanForm(emptyPlanForm);
    }
    setMessage('');
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !planForm.floor.trim()) return;

    setSavingPlan(true);
    setMessage('');
    try {
      const uploaded = await uploadFloorPlan(planForm.floor.trim(), file, planForm.building.trim() || 'HQ - Prishtina');
      setPlans((prev) => {
        const rest = prev.filter((item) => item.id !== uploaded.id && item.floor !== uploaded.floor);
        return [...rest, uploaded].sort((a, b) => a.floor.localeCompare(b.floor, undefined, { numeric: true }));
      });
      setFloor(uploaded.floor);
      setEditingPlanId(null);
      setMessage(`Floor plan for floor ${uploaded.floor} saved successfully.`);
    } catch (error) {
      setMessage(error?.response?.data?.detail ?? 'Could not upload the floor plan.');
    } finally {
      setSavingPlan(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSavePlanDetails = async () => {
    if (!editingPlanId) return;

    setSavingPlan(true);
    setMessage('');
    try {
      const updated = await updateFloorPlan(editingPlanId, {
        building: planForm.building.trim() || 'HQ - Prishtina',
        floor: planForm.floor.trim(),
      });
      const sorted = await reloadPlans();
      setFloor(updated.floor);
      setEditingPlanId(null);
      setSelectedPlanId(null);
      if (!sorted.find((item) => item.floor === updated.floor)) {
        setFloor(sorted[0]?.floor ?? '');
      }
      setMessage(`Floor ${updated.floor} updated successfully.`);
    } catch (error) {
      setMessage(error?.response?.data?.detail ?? 'Could not update this floor plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (selectedPlan) => {
    if (!confirm(`Delete the floor plan for floor ${selectedPlan.floor}?`)) return;

    setSavingPlan(true);
    setMessage('');
    try {
      await deleteFloorPlan(selectedPlan.id);
      const nextPlans = await reloadPlans();
      const nextFloor = nextPlans[0]?.floor ?? '';
      setFloor(floor === selectedPlan.floor ? nextFloor : floor);
      if (editingPlanId === selectedPlan.id) setEditingPlanId(null);
      if (selectedPlanId === selectedPlan.id) setSelectedPlanId(null);
      setMessage(`Floor ${selectedPlan.floor} deleted successfully.`);
    } catch (error) {
      setMessage(error?.response?.data?.detail ?? 'Could not delete this floor plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleCreateResource = async () => {
    if (!resourceForm.name.trim() || !resourceForm.floor.trim()) return;

    setSavingResource(true);
    setMessage('');
    try {
      await createResource({
        ...resourceForm,
        name: resourceForm.name.trim(),
        building: resourceForm.building.trim() || plan?.building || 'HQ - Prishtina',
        floor: resourceForm.floor.trim(),
        zone: resourceForm.zone.trim(),
        amenities: resourceForm.amenities.trim() || undefined,
        desk_type:
          resourceForm.type === 'room'
            ? 'Meeting Room'
            : resourceForm.desk_type.trim() || undefined,
      });
      const updated = await getResources({ floor: resourceForm.floor.trim() });
      setResources(updated);
      setResourceForm({
        ...emptyResourceForm,
        floor: floor || plan?.floor || '',
        building: plan?.building || 'HQ - Prishtina',
      });
      setCreatingResource(false);
      setMessage('Resource saved successfully and is now available across the app.');
    } catch (error) {
      setMessage(error?.response?.data?.detail ?? 'Could not save this resource.');
    } finally {
      setSavingResource(false);
    }
  };

  const handleCanvasClick = async (e) => {
    if (!selected || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    await updateResourcePosition(selected.id, x, y);
    setResources((prev) =>
      prev.map((resource) =>
        resource.id === selected.id ? { ...resource, floor_plan_x: x, floor_plan_y: y } : resource,
      ),
    );
  };

  const handleDrag = (e, resource) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setResources((prev) =>
      prev.map((item) =>
        item.id === resource.id ? { ...item, floor_plan_x: x, floor_plan_y: y } : item,
      ),
    );
  };

  const handleDragEnd = async (resource) => {
    if (resource.floor_plan_x == null || resource.floor_plan_y == null) return;
    await updateResourcePosition(resource.id, resource.floor_plan_x, resource.floor_plan_y);
    setDragging(null);
  };

  return (
    <div>
      <PageHeader
        title={headerTitle}
        subtitle={headerSubtitle}
      />

      {message && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="card mb-4 flex flex-wrap items-center gap-4 p-4">
            <select
              value={floor}
              onChange={(e) => {
                setFloor(e.target.value);
                setEditingPlanId(null);
                setSelectedPlanId(null);
                setMessage('');
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {floorOptions.length > 0 ? (
                floorOptions.map((item) => (
                  <option key={item} value={item}>
                    Floor {item}
                  </option>
                ))
              ) : (
                <option value="">No floor plans yet</option>
              )}
            </select>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
              <Upload size={16} />
              {plan ? 'Replace floor plan' : 'Upload floor plan'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>

            {plan && !editingPlanId && (
              <>
                <button
                  type="button"
                  onClick={() => startEditingPlan(plan)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-brand-700 hover:bg-slate-50"
                >
                  <Pencil size={16} />
                  Edit floor details
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePlan(plan)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Delete floor
                </button>
              </>
            )}

            {selected && (
              <p className="text-sm text-slate-500">
                Selected: <strong>{selected.name}</strong> - click canvas to place or drag pin
              </p>
            )}
          </div>

          <div className="card mb-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Add Resource</h4>
                <p className="text-xs text-slate-500">
                  Create a desk or meeting room and save it to show everywhere in the app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreatingResource((current) => !current)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {creatingResource ? 'Close' : 'New Resource'}
              </button>
            </div>

            {creatingResource && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  placeholder="Resource name"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={resourceForm.type}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      type: e.target.value,
                      desk_type: e.target.value === 'room' ? 'Meeting Room' : resourceForm.desk_type,
                    })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="desk">Desk</option>
                  <option value="room">Meeting Room</option>
                </select>
                <input
                  value={resourceForm.floor}
                  onChange={(e) => setResourceForm({ ...resourceForm, floor: e.target.value })}
                  placeholder="Floor"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={resourceForm.building}
                  onChange={(e) => setResourceForm({ ...resourceForm, building: e.target.value })}
                  placeholder="HQ location"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={resourceForm.zone}
                  onChange={(e) => setResourceForm({ ...resourceForm, zone: e.target.value })}
                  placeholder="Zone"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="1"
                  value={resourceForm.capacity}
                  onChange={(e) => setResourceForm({ ...resourceForm, capacity: Number(e.target.value) })}
                  placeholder="Capacity"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {resourceForm.type === 'desk' ? (
                  <input
                    value={resourceForm.desk_type}
                    onChange={(e) => setResourceForm({ ...resourceForm, desk_type: e.target.value })}
                    placeholder="Desk type"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                  />
                ) : null}
                <input
                  value={resourceForm.amenities}
                  onChange={(e) => setResourceForm({ ...resourceForm, amenities: e.target.value })}
                  placeholder="Amenities, comma-separated"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                />
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleCreateResource}
                    disabled={savingResource}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {savingResource ? 'Saving...' : 'Save Resource'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingResource(false);
                      setResourceForm({
                        ...emptyResourceForm,
                        floor: floor || plan?.floor || '',
                        building: plan?.building || 'HQ - Prishtina',
                      });
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 xl:flex-row">
            <div className="card max-h-72 w-full shrink-0 space-y-2 overflow-auto p-4 xl:max-h-none xl:w-56">
              <h4 className="text-sm font-semibold">Resources on floor {floor || '-'}</h4>
              {resources.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => setSelected(resource)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selected?.id === resource.id
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {resource.name}
                  <span className="block text-xs text-slate-400">
                    {resource.building} - {resource.zone}
                  </span>
                </button>
              ))}
              {resources.length === 0 && (
                <p className="text-xs text-slate-400">No resources mapped to this floor yet.</p>
              )}
            </div>

            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="relative min-h-[360px] flex-1 cursor-crosshair overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 sm:min-h-[460px] xl:min-h-[520px]"
            >
              {plan ? (
                <img src={plan.image_url} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Upload a floor plan image to get started
                </div>
              )}
              {resources
                .filter((resource) => resource.floor_plan_x != null && resource.floor_plan_y != null)
                .map((resource) => (
                  <div
                    key={resource.id}
                    role="button"
                    tabIndex={0}
                    onMouseDown={() => setDragging(resource.id)}
                    onMouseMove={(e) => dragging === resource.id && handleDrag(e, resource)}
                    onMouseUp={() => dragging === resource.id && handleDragEnd(resource)}
                    onMouseLeave={() => dragging === resource.id && handleDragEnd(resource)}
                    style={{
                      left: `${resource.floor_plan_x}%`,
                      top: `${resource.floor_plan_y}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full px-2 py-1 text-xs font-medium text-white ${
                      selected?.id === resource.id ? 'bg-yellow-500 ring-2 ring-yellow-300' : 'bg-brand-600'
                    }`}
                  >
                    {resource.name}
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingPlanId ? 'Edit Floor Plan' : 'Floor Plan Details'}
              </h3>
              {editingPlanId && (
                <button
                  type="button"
                  onClick={cancelEditingPlan}
                  className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                >
                  <X size={14} />
                  Cancel
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={planForm.building}
                onChange={(e) => setPlanForm({ ...planForm, building: e.target.value })}
                placeholder="HQ location / building"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={planForm.floor}
                onChange={(e) => setPlanForm({ ...planForm, floor: e.target.value })}
                placeholder="Floor"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

              {editingPlanId ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSavePlanDetails}
                    disabled={savingPlan || !planForm.floor.trim()}
                    className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {savingPlan ? 'Saving...' : 'Save floor details'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePlan(plan)}
                    disabled={savingPlan || !plan}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Choose a floor plan from the list below or from the floor selector, then click
                  `Edit floor details` to rename the floor or change the building.
                </p>
              )}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900">Existing Floor Plans</h3>
            <div className="mt-3 space-y-2">
              {plans.length > 0 ? (
                plans.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-3 ${
                      item.floor === floor
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <button
                    type="button"
                    onClick={() => {
                      setFloor(item.floor);
                      setEditingPlanId(null);
                      setSelectedPlanId(item.id);
                      setMessage('');
                    }}
                      className="w-full text-left"
                    >
                      <p className="text-sm font-medium text-slate-900">Floor {item.floor}</p>
                      <p className="text-xs text-slate-500">{item.building}</p>
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingPlan(item)}
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(item)}
                        className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No floor plans uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
