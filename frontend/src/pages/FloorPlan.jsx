import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { Calendar, Filter, Layers, LocateFixed } from 'lucide-react';
import {
  addFavorite,
  createReservation,
  getFloorPlans,
  getFloors,
  getResources,
  getTeamDeskRecommendations,
  getZones,
  removeFavorite,
} from '../api/client';
import DeskDetailPanel from '../components/DeskDetailPanel';
import ResourceDetailsModal from '../components/ResourceDetailsModal';
import PageHeader from '../components/ui/PageHeader';
import { ZONE_OPTIONS } from '../lib/constants';

const STATUS = {
  available: { dot: 'bg-emerald-500', ring: 'ring-emerald-300', label: 'Available' },
  reserved: { dot: 'bg-red-500', ring: 'ring-red-300', label: 'Reserved' },
  mine: { dot: 'bg-blue-500', ring: 'ring-blue-300', label: 'My Reservation' },
  selected: { dot: 'bg-amber-400', ring: 'ring-amber-300', label: 'Selected' },
};

export default function FloorPlan() {
  const [searchParams] = useSearchParams();
  const resourceId = searchParams.get('resourceId');
  const floorFromQuery = searchParams.get('floor') ?? '';
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [floor, setFloor] = useState(floorFromQuery);
  const [zoneFilters, setZoneFilters] = useState([]);
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const nearTeam = searchParams.get('nearTeam') === '1';
  const [floors, setFloors] = useState([]);
  const [zones, setZones] = useState([]);
  const [resources, setResources] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [teamHint, setTeamHint] = useState('');
  const [message, setMessage] = useState('');
  const [reservationMode, setReservationMode] = useState('all_day');
  const [roomStartTime, setRoomStartTime] = useState('09:00');
  const [roomEndTime, setRoomEndTime] = useState('17:00');

  useEffect(() => {
    if (floorFromQuery && floorFromQuery !== floor) {
      setFloor(floorFromQuery);
    }
  }, [floorFromQuery, floor]);

  useEffect(() => {
    getFloors().then((f) => {
      setFloors(f);
      if (f.length && !floor) setFloor(f[0]);
    });
    getFloorPlans().then(setPlans);
  }, []);

  useEffect(() => {
    if (floor) getZones(floor).then(setZones);
  }, [floor]);

  const zone = zoneFilters.length === 1 ? zoneFilters[0] : undefined;

  useEffect(() => {
    if (nearTeam) {
      getTeamDeskRecommendations().then((data) => {
        setTeamHint(
          data.team_zone
            ? `Team desks are usually near ${data.team_zone}`
            : 'No team desk history yet, showing a broad set of suggestions',
        );
        setResources(data.resources);
        if (data.resources?.length && !floor) {
          setFloor(data.resources[0].floor);
        }
      });
      return;
    }

    getResources({
      date,
      floor: floor || undefined,
      zone,
      type: type || undefined,
    }).then((data) => {
      const filtered =
        zoneFilters.length > 1
          ? data.filter((r) => zoneFilters.includes(r.zone))
          : data;
      setResources(filtered);
    });
  }, [date, floor, zone, zoneFilters, type, nearTeam]);

  useEffect(() => {
    if (selected?.type !== 'room') {
      setReservationMode('all_day');
      return;
    }
    if (reservationMode !== 'slot' && reservationMode !== 'all_day') {
      setReservationMode('all_day');
    }
  }, [selected, reservationMode]);

  useEffect(() => {
    if (!resourceId || !resources.length) return;

    const match = resources.find((resource) => String(resource.id) === resourceId);
    if (match) {
      setSelected(match);
    }
  }, [resourceId, resources]);

  const plan = plans.find((p) => p.floor === floor);
  const maxDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const getStatus = (r) => {
    if (selected?.id === r.id) return 'selected';
    if (r.is_mine) return 'mine';
    if (!r.is_available) return 'reserved';
    return 'available';
  };

  const toggleZone = (z) => {
    setZoneFilters((prev) =>
      prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z],
    );
  };

  const handleBook = async () => {
    if (!selected) return;
    setBooking(true);
    setMessage('');
    try {
      const startTime = selected.type === 'room' && reservationMode === 'slot' ? roomStartTime : null;
      const endTime = selected.type === 'room' && reservationMode === 'slot' ? roomEndTime : null;
      await createReservation(selected.id, date, startTime, endTime);
      setMessage('Reservation confirmed successfully!');
      const updated = await getResources({
        date,
        floor,
        zone,
        type: type || undefined,
      });
      setResources(updated);
      setSelected(null);
      setDetailsOpen(false);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ??
        'Booking failed';
      setMessage(String(msg));
    } finally {
      setBooking(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selected) return;
    setFavoriteBusy(true);
    setMessage('');
    try {
      const updated = selected.is_favorite
        ? await removeFavorite(selected.id)
        : await addFavorite(selected.id);
      setSelected(updated);
      setResources((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      const refreshed = await getResources({
        date,
        floor: floor || undefined,
        zone,
        type: type || undefined,
      });
      const filtered =
        zoneFilters.length > 1
          ? refreshed.filter((r) => zoneFilters.includes(r.zone))
          : refreshed;
      setResources(filtered);
      setSelected((prev) =>
        prev && filtered.some((r) => r.id === prev.id)
          ? filtered.find((r) => r.id === prev.id) ?? updated
          : updated,
      );
    } catch (err) {
      setMessage(String(err?.response?.data?.detail ?? 'Could not update favorites.'));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const openDetails = () => {
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Interactive Floor Plan"
        subtitle="Browse availability and reserve desks or meeting rooms visually"
      />
      {nearTeam && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <LocateFixed size={16} />
          {teamHint || 'Finding desks near your team...'}
        </div>
      )}

      <div className="card mb-4 flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Calendar size={12} /> Date
          </label>
          <input
            type="date"
            value={date}
            min={format(new Date(), 'yyyy-MM-dd')}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-auto"
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Layers size={12} /> Floor
          </label>
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="input-field w-auto min-w-[140px]"
          >
            {floors.map((f) => (
              <option key={f} value={f}>
                Floor {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resource Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-field w-auto min-w-[140px]"
          >
            <option value="">All resources</option>
            <option value="desk">Desks only</option>
            <option value="room">Rooms only</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <aside className="card hidden w-56 shrink-0 p-4 lg:block">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter size={16} /> Zones
          </div>
          <div className="mt-3 space-y-2">
            {(zones.length ? zones : ZONE_OPTIONS).map((z) => (
              <label
                key={z}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={zoneFilters.length === 0 || zoneFilters.includes(z)}
                  onChange={() => toggleZone(z)}
                  className="rounded border-slate-300 text-brand-600"
                />
                {z}
              </label>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legend</p>
            <div className="mt-3 space-y-2.5">
              {Object.entries(STATUS).map(([key, { dot, label }]) => (
                <div key={key} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className={`h-3.5 w-3.5 rounded-full ${dot}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
          {plan ? (
            <img
              src={plan.image_url}
              alt={`Floor ${floor}`}
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />
          ) : (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
          )}
          <div className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow backdrop-blur">
            Floor {floor} · {format(new Date(date + 'T12:00:00'), 'EEE, MMM d')}
          </div>
          {resources
            .filter((r) => r.floor_plan_x != null && r.floor_plan_y != null)
            .map((r) => {
              const status = getStatus(r);
              const s = STATUS[status];
              return (
                <button
                  key={r.id}
                  type="button"
                  title={`${r.name} — ${s.label}`}
                  onClick={() => setSelected(r)}
                  style={{
                    left: `${r.floor_plan_x}%`,
                    top: `${r.floor_plan_y}%`,
                  }}
                  className={`absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 transition hover:scale-125 ${s.dot} ${s.ring}`}
                />
              );
            })}
        </div>

        {selected && (
          <DeskDetailPanel
            desk={selected}
            date={date}
            onClose={() => setSelected(null)}
            onBook={handleBook}
            onMoreDetails={openDetails}
            booking={booking}
            favoriteBusy={favoriteBusy}
            onToggleFavorite={handleToggleFavorite}
            reservationMode={reservationMode}
            setReservationMode={setReservationMode}
            roomStartTime={roomStartTime}
            setRoomStartTime={setRoomStartTime}
            roomEndTime={roomEndTime}
            setRoomEndTime={setRoomEndTime}
            message={message}
          />
        )}
      </div>

      {selected && detailsOpen && (
        <ResourceDetailsModal
          desk={selected}
          resources={resources}
          selectedDate={date}
          onClose={closeDetails}
          onBook={handleBook}
          onToggleFavorite={handleToggleFavorite}
          favoriteBusy={favoriteBusy}
          booking={booking}
        />
      )}

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">All Resources</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Floor</th>
              <th className="px-6 py-3">Zone</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Desk Type</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer border-t border-slate-100 transition hover:bg-brand-50/30"
                onClick={() => setSelected(r)}
              >
                <td className="px-6 py-3.5 font-medium text-slate-900">{r.name}</td>
                <td className="px-6 py-3.5 text-slate-600">{r.floor}</td>
                <td className="px-6 py-3.5 text-slate-600">{r.zone}</td>
                <td className="px-6 py-3.5 capitalize text-slate-600">{r.type}</td>
                <td className="px-6 py-3.5 text-slate-600">{r.desk_type ?? '—'}</td>
                <td className="px-6 py-3.5">
                  {r.is_mine ? (
                    <span className="badge-blue">Mine</span>
                  ) : r.is_available ? (
                    <span className="badge-green">Available</span>
                  ) : (
                    <span className="badge-red">Taken</span>
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
