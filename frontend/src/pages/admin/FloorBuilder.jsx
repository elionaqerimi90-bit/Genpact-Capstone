import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import {
  getFloorPlans,
  getFloors,
  getResources,
  updateResourcePosition,
  uploadFloorPlan,
} from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';

export default function FloorBuilder() {
  const [floors, setFloors] = useState([]);
  const [floor, setFloor] = useState('');
  const [resources, setResources] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    getFloors().then((f) => {
      setFloors(f);
      if (f.length) setFloor(f[0]);
    });
    getFloorPlans().then(setPlans);
  }, []);

  useEffect(() => {
    if (floor) getResources({ floor }).then(setResources);
  }, [floor]);

  const plan = plans.find((p) => p.floor === floor);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !floor) return;
    const uploaded = await uploadFloorPlan(floor, file);
    setPlans((prev) => {
      const rest = prev.filter((p) => p.floor !== floor);
      return [...rest, uploaded];
    });
  };

  const handleCanvasClick = async (e) => {
    if (!selected || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    await updateResourcePosition(selected.id, x, y);
    setResources((prev) =>
      prev.map((r) =>
        r.id === selected.id ? { ...r, floor_plan_x: x, floor_plan_y: y } : r,
      ),
    );
  };

  const handleDrag = async (e, resource) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setResources((prev) =>
      prev.map((r) =>
        r.id === resource.id ? { ...r, floor_plan_x: x, floor_plan_y: y } : r,
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
        title="Floor Plan Builder"
        subtitle="Upload office blueprints and place desks with drag-and-drop pins"
      />
      <div className="card mb-4 flex flex-wrap items-center gap-4 p-4">
        <select
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {floors.map((f) => (
            <option key={f} value={f}>
              Floor {f}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
          <Upload size={16} />
          Upload floor plan
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
        {selected && (
          <p className="text-sm text-slate-500">
            Selected: <strong>{selected.name}</strong> — click canvas to place or drag pin
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="card w-56 shrink-0 space-y-2 p-4">
          <h4 className="text-sm font-semibold">Desks on floor {floor}</h4>
          {resources.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                selected?.id === r.id
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r.name}
              <span className="block text-xs text-slate-400">{r.zone}</span>
            </button>
          ))}
        </div>

        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="relative min-h-[520px] flex-1 cursor-crosshair overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-100"
        >
          {plan ? (
            <img src={plan.image_url} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Upload a floor plan image to get started
            </div>
          )}
          {resources
            .filter((r) => r.floor_plan_x != null && r.floor_plan_y != null)
            .map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onMouseDown={() => setDragging(r.id)}
                onMouseMove={(e) => dragging === r.id && handleDrag(e, r)}
                onMouseUp={() => dragging === r.id && handleDragEnd(r)}
                onMouseLeave={() => dragging === r.id && handleDragEnd(r)}
                style={{
                  left: `${r.floor_plan_x}%`,
                  top: `${r.floor_plan_y}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full px-2 py-1 text-xs font-medium text-white ${
                  selected?.id === r.id ? 'bg-yellow-500 ring-2 ring-yellow-300' : 'bg-brand-600'
                }`}
              >
                {r.name}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
