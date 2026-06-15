import { Calendar, Heart, MapPin, Star, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AMENITY_ICONS, DESK_IMAGES } from '../lib/constants';


export default function DeskDetailPanel({
  desk,
  date,
  onClose,
  onBook,
  booking,
  message,
}) {
  const image =
    DESK_IMAGES[desk.desk_type ?? ''] ?? DESK_IMAGES.default;
  const amenities = desk.amenities?.split(',').map((a) => a.trim()) ?? [];

  return (
    <div className="card-elevated flex w-80 shrink-0 flex-col overflow-hidden lg:w-96">
      <div className="relative h-44 overflow-hidden">
        <img src={image} alt={desk.name} className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-slate-600 shadow hover:bg-white"
        >
          <X size={16} />
        </button>
        {desk.is_available && !desk.is_mine && (
          <span className="badge-green absolute left-3 top-3">Available Now</span>
        )}
        {desk.desk_type === 'Window Desk' && (
          <span className="badge-blue absolute bottom-3 left-3">
            <Star size={12} className="mr-1" /> Popular Desk
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-brand-600">
          Floor {desk.floor} &gt; {desk.zone}
        </p>
        <h3 className="mt-1 text-xl font-bold text-slate-900">{desk.name}</h3>
        {desk.desk_type && (
          <p className="text-sm text-slate-500">{desk.desk_type}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {desk.is_mine ? (
            <span className="badge-blue">My Reservation</span>
          ) : desk.is_available ? (
            <span className="badge-green">Available</span>
          ) : (
            <span className="badge-red">
              Reserved{desk.reserved_by ? ` · ${desk.reserved_by}` : ''}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
            <MapPin size={11} /> Capacity {desk.capacity}
          </span>
        </div>

        {amenities.length > 0 && (
          <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
            {amenities.map((a) => (
              <li key={a} className="flex gap-3 text-sm">
                <span className="text-base">{AMENITY_ICONS[a] ?? '✓'}</span>
                <span className="text-slate-700">{a}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <Calendar size={16} className="text-brand-600" />
          <span>
            Booking for{' '}
            <strong>{format(parseISO(date), 'EEEE, MMM d')}</strong>
          </span>
        </div>

        {desk.is_available && !desk.is_mine && (
          <button type="button" onClick={onBook} disabled={booking} className="btn-primary mt-4 w-full">
            <Calendar size={16} />
            {booking ? 'Reserving…' : 'Reserve Now'}
          </button>
        )}
        <button type="button" className="btn-secondary mt-2 w-full">
          <Heart size={16} /> Add to Favorites
        </button>

        {message && (
          <p
            className={`mt-3 text-center text-sm ${
              message.includes('success') ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
