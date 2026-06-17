import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Heart,
  Info,
  MapPin,
  Minus,
  Monitor,
  MoveLeft,
  Plus,
  Star,
  Tv,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { DESK_IMAGES } from '../lib/constants';

const DETAIL_AMENITIES = {
  'Window View': { icon: MapPin, copy: 'Great natural light and city view' },
  'Near window': { icon: MapPin, copy: 'Placed close to windows for better natural light' },
  'Dual Monitors': { icon: Monitor, copy: '27" monitors with docking station' },
  'Dual monitors': { icon: Monitor, copy: 'Dual-screen setup for multitasking' },
  'Ergonomic Chair': { icon: Users, copy: 'Premium adjustable chair' },
  'Ergonomic chair': { icon: Users, copy: 'Comfortable ergonomic seating for long work sessions' },
  'Standing Desk': { icon: MoveLeft, copy: 'Height adjustable desk' },
  'Standing desk': { icon: MoveLeft, copy: 'Switch easily between sitting and standing' },
  'Power & USB': { icon: Tv, copy: 'Multiple power and USB outlets' },
  'Charging station': { icon: Tv, copy: 'Easy access to power for laptops and phones' },
  'Docking station': { icon: Monitor, copy: 'Connect quickly to shared monitors and peripherals' },
  'Near Coffee Bar': { icon: Coffee, copy: '1 min walk to coffee bar' },
  'Near coffee bar': { icon: Coffee, copy: 'Quick access to coffee and break areas' },
  'Quiet zone': { icon: Info, copy: 'Good for focused work with fewer distractions' },
  'Near team': { icon: Users, copy: 'Convenient for sitting close to teammates' },
  'Phone booth nearby': { icon: Info, copy: 'Private call space is close by when needed' },
};

const NOISE_SCORE = {
  'Quiet Zone': { label: 'Low', bars: 2 },
  Collaboration: { label: 'High', bars: 5 },
  Meeting: { label: 'Medium', bars: 3 },
  'Open Area': { label: 'Medium', bars: 3 },
};

function NoiseMeter({ bars }) {
  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: 6 }).map((_, index) => (
        <span
          key={index}
          className={`w-1.5 rounded-full ${index < bars ? 'bg-emerald-500' : 'bg-slate-200'}`}
          style={{ height: `${8 + index * 4}px` }}
        />
      ))}
    </div>
  );
}

function getLabelForType(type) {
  if (type === 'room') return 'Meeting Room';
  return 'Desk';
}

export default function ResourceDetailsModal({
  desk,
  resources = [],
  selectedDate,
  onClose,
  onBook,
  onToggleFavorite,
  favoriteBusy,
  booking,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [railSelection, setRailSelection] = useState(desk.desk_type ?? 'Hot Desk');
  const [zoom, setZoom] = useState(1);
  const [panEnabled, setPanEnabled] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setRailSelection(desk.desk_type ?? 'Hot Desk');
    setActiveIndex(0);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPanEnabled(false);
  }, [desk]);

  const sameKindResources = useMemo(
    () =>
      resources.filter((resource) =>
        desk.type === 'room'
          ? resource.type === 'room'
          : resource.type === 'desk',
      ),
    [desk.type, resources],
  );

  const detailLibrary = useMemo(() => {
    const grouped = new Map();
    sameKindResources.forEach((resource) => {
      const key = resource.desk_type || getLabelForType(resource.type);
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          title: key,
          description:
            resource.type === 'room'
              ? 'Collaborative room setup'
              : `${resource.zone} workspace option`,
          availableCount: 0,
          image: DESK_IMAGES[key] ?? DESK_IMAGES.default,
        });
      }
      const item = grouped.get(key);
      if (resource.is_available) item.availableCount += 1;
    });

    if (!grouped.size) {
      grouped.set(desk.desk_type ?? getLabelForType(desk.type), {
        key: desk.desk_type ?? getLabelForType(desk.type),
        title: desk.desk_type ?? getLabelForType(desk.type),
        description: desk.type === 'room' ? 'Collaborative room setup' : `${desk.zone} workspace option`,
        availableCount: desk.is_available ? 1 : 0,
        image: DESK_IMAGES[desk.desk_type ?? ''] ?? DESK_IMAGES.default,
      });
    }

    return [...grouped.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [desk, sameKindResources]);

  const selectedLibraryItem =
    detailLibrary.find((item) => item.key === railSelection) ?? detailLibrary[0];

  const gallery = useMemo(() => {
    const primary = desk.type === 'room'
      ? [selectedLibraryItem?.image, DESK_IMAGES['Team Pod'], DESK_IMAGES['Executive Desk'], DESK_IMAGES.default]
      : [
          DESK_IMAGES[desk.desk_type ?? ''] ?? DESK_IMAGES.default,
          selectedLibraryItem?.image,
          DESK_IMAGES['Standing Desk'],
          DESK_IMAGES['Focus Desk'],
          DESK_IMAGES['Executive Desk'],
        ];
    return primary.filter(Boolean);
  }, [desk, selectedLibraryItem]);

  useEffect(() => {
    if (activeIndex > gallery.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, gallery.length]);

  const activeImage = gallery[activeIndex] ?? gallery[0];
  const amenities = desk.amenities?.split(',').map((a) => a.trim()).filter(Boolean) ?? [];
  const noise = NOISE_SCORE[desk.zone] ?? { label: 'Medium', bars: 3 };
  const bestFor = desk.type === 'room'
    ? 'Team meetings, client calls'
    : desk.zone === 'Quiet Zone'
      ? 'Focus work, individual tasks'
      : 'Collaboration, hybrid workdays';

  const popularityScore = useMemo(() => {
    const peerGroup = sameKindResources.filter((resource) =>
      (resource.desk_type || getLabelForType(resource.type)) === (desk.desk_type || getLabelForType(desk.type)),
    );
    if (!peerGroup.length) return 92;
    const busyCount = peerGroup.filter((resource) => !resource.is_available).length;
    return Math.max(8, Math.min(99, Math.round((busyCount / peerGroup.length) * 100)));
  }, [desk, sameKindResources]);

  const nextAvailable = useMemo(() => {
    if (desk.is_available) {
      return {
        day: 'Available today',
        time: 'Now',
      };
    }

    const baseDate = selectedDate ? parseISO(selectedDate) : new Date();
    return {
      day: format(addDays(baseDate, 1), 'EEEE, MMM d'),
      time: '08:00 AM',
    };
  }, [desk.is_available, selectedDate]);

  const handlePrev = () => setActiveIndex((current) => (current === 0 ? gallery.length - 1 : current - 1));
  const handleNext = () => setActiveIndex((current) => (current === gallery.length - 1 ? 0 : current + 1));

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPanEnabled(false);
  };

  const moveImage = (direction) => {
    if (!panEnabled) return;
    const delta = 40;
    if (direction === 'left') setOffset((prev) => ({ ...prev, x: prev.x - delta }));
    if (direction === 'right') setOffset((prev) => ({ ...prev, x: prev.x + delta }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="flex h-full min-h-0 flex-col xl:flex-row">
        <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white xl:flex xl:flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <button
              type="button"
              onClick={onClose}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Reserve
            </button>
            <h3 className="text-xl font-semibold text-slate-900">Explore Desk Types</h3>
            <p className="mt-1 text-sm text-slate-500">Select a resource style to preview it</p>
          </div>
          <div className="flex-1 space-y-4 overflow-auto px-4 py-5">
            {detailLibrary.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setRailSelection(item.key);
                  setActiveIndex(0);
                }}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                  item.key === railSelection
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-22 w-20 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{item.title}</div>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  <div className="mt-3 text-sm font-semibold text-brand-600">
                    {item.availableCount} Available
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="relative flex min-h-0 flex-1 flex-col bg-slate-950 xl:flex-row">
          <div className="absolute left-4 top-4 z-20 xl:hidden">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/90 p-3 text-slate-700 shadow-lg backdrop-blur hover:bg-white"
            >
              <ArrowLeft size={18} />
            </button>
          </div>

          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={activeImage}
                alt={desk.name}
                className="h-full w-full object-cover transition-transform duration-200"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  cursor: panEnabled ? 'grab' : 'default',
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/10 to-black/25" />

            <div className="relative z-10 flex items-center justify-between px-8 py-7">
              <div>
                <p className="text-sm text-slate-500">Floor {desk.floor} &gt; {desk.zone}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h2 className="text-4xl font-bold tracking-tight text-slate-900">{desk.name}</h2>
                  <span className="badge-green text-sm">{desk.is_available ? 'Available' : 'Reserved'}</span>
                </div>
              </div>
              <div className="hidden items-center gap-3 xl:flex">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-white/90 p-4 text-slate-700 shadow-lg backdrop-blur hover:bg-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-7 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-4 text-slate-700 shadow-lg backdrop-blur hover:bg-white"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-[22rem] top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-4 text-slate-700 shadow-lg backdrop-blur hover:bg-white xl:block"
            >
              <ChevronRight size={26} />
            </button>

            <div className="relative mt-auto px-8 pb-7">
              <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl bg-slate-900/72 px-5 py-4 text-sm text-white shadow-xl backdrop-blur">
                <button type="button" onClick={() => setPanEnabled((current) => !current)}>
                  Pan{panEnabled ? ' On' : ''}
                </button>
                <span className="h-5 w-px bg-white/15" />
                <button type="button" onClick={() => setZoom((current) => Math.min(2.5, current + 0.2))}>
                  <Plus size={14} className="inline" /> Zoom
                </button>
                <button type="button" onClick={() => setZoom((current) => Math.max(1, current - 0.2))}>
                  <Minus size={14} className="inline" />
                </button>
                <span className="h-5 w-px bg-white/15" />
                <button type="button" onClick={resetView}>Reset View</button>
              </div>

              {panEnabled && (
                <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-2xl bg-slate-900/72 px-4 py-2 text-xs text-white shadow-xl backdrop-blur">
                  <button type="button" onClick={() => moveImage('left')}>Move Left</button>
                  <span className="h-4 w-px bg-white/15" />
                  <button type="button" onClick={() => moveImage('right')}>Move Right</button>
                </div>
              )}

              <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`min-w-[140px] rounded-2xl border bg-white/92 p-2 shadow-lg backdrop-blur transition ${
                      index === activeIndex ? 'border-brand-500 ring-2 ring-brand-300' : 'border-white/40'
                    }`}
                  >
                    <img src={image} alt={`${desk.name} view ${index + 1}`} className="h-20 w-full rounded-xl object-cover" />
                    <div className="px-2 py-2 text-left text-sm font-semibold text-slate-800">
                      {index === 0 ? (desk.desk_type ?? desk.name) : `${desk.type === 'room' ? 'Meeting Room' : 'Workspace'} View ${index + 1}`}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-4 rounded-3xl border border-white/50 bg-white/92 p-5 text-sm shadow-xl backdrop-blur md:grid-cols-5">
                <div>
                  <div className="text-slate-500">Location</div>
                  <div className="mt-2 font-semibold text-slate-900">{desk.building ?? 'HQ - Prishtina'}</div>
                  <div className="text-slate-500">{desk.type === 'room' ? 'Meeting space' : 'Workspace zone'}</div>
                </div>
                <div>
                  <div className="text-slate-500">Floor</div>
                  <div className="mt-2 font-semibold text-slate-900">{desk.floor}</div>
                  <div className="text-slate-500">{desk.zone}</div>
                </div>
                <div>
                  <div className="text-slate-500">Capacity</div>
                  <div className="mt-2 font-semibold text-slate-900">{desk.capacity} {desk.capacity === 1 ? 'Person' : 'People'}</div>
                </div>
                <div>
                  <div className="text-slate-500">Noise Level</div>
                  <div className="mt-2 font-semibold text-slate-900">{noise.label}</div>
                  <div className="mt-2"><NoiseMeter bars={noise.bars} /></div>
                </div>
                <div>
                  <div className="text-slate-500">Best For</div>
                  <div className="mt-2 font-semibold text-slate-900">{bestFor}</div>
                </div>
              </div>
            </div>
          </main>

          <aside className="w-full shrink-0 border-l border-slate-200 bg-white px-5 py-7 xl:w-[340px]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="hidden rounded-full bg-slate-100 p-3 text-slate-600 hover:bg-slate-200 xl:inline-flex"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  disabled={favoriteBusy}
                  className="rounded-full bg-slate-100 p-3 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  <Heart size={18} fill={desk.is_favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-slate-100 p-3 text-slate-700 hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <h3 className="text-4xl font-bold tracking-tight text-slate-900">{desk.name}</h3>
              <p className="mt-3 text-base text-slate-500">Floor {desk.floor} • {desk.zone}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="badge-green text-sm">{desk.is_available ? 'Available Now' : 'Currently Reserved'}</span>
                {popularityScore >= 70 && desk.type === 'desk' && (
                  <span className="badge-blue text-sm"><Star size={12} className="mr-1" /> Popular Desk</span>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <h4 className="text-lg font-semibold text-slate-900">Amenities</h4>
                <div className="mt-4 space-y-4">
                  {amenities.length > 0 ? amenities.map((amenity) => {
                    const meta = DETAIL_AMENITIES[amenity];
                    const Icon = meta?.icon ?? Info;
                    return (
                      <div key={amenity} className="flex gap-3">
                        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{amenity}</div>
                          <div className="text-sm text-slate-500">{meta?.copy ?? 'Configured for everyday office work'}</div>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-slate-500">No amenities listed yet for this resource.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">Usage Score</div>
                      <div className="mt-1 text-sm text-slate-500">How popular is this {desk.type === 'room' ? 'room' : 'desk'}?</div>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-500 text-lg font-bold text-slate-900">
                      {popularityScore}%
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-semibold text-slate-900">Next Available</div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-brand-600">{nextAvailable.day}</span>
                    <span className="font-semibold text-slate-900">{nextAvailable.time}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onBook}
                disabled={booking || !desk.is_available || desk.is_mine}
                className="btn-primary mt-6 w-full py-4 text-base"
              >
                {booking ? 'Reserving...' : 'Reserve Now'}
              </button>
              <button
                type="button"
                onClick={onToggleFavorite}
                disabled={favoriteBusy}
                className="btn-secondary mt-3 w-full py-4 text-base"
              >
                <Heart size={18} fill={desk.is_favorite ? 'currentColor' : 'none'} />
                {desk.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </button>

              <p className="mt-5 text-center text-sm text-slate-500">
                Need help? <span className="font-semibold text-brand-600">Contact support</span>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
