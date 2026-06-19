import { Calendar, Heart, MapPin, Star, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AMENITY_ICONS, DESK_IMAGES } from '../lib/constants';

export default function DeskDetailPanel({
  desk,
  date,
  onClose,
  onBook,
  onBookTeam,
  onMoreDetails,
  booking,
  message,
  favoriteBusy,
  onToggleFavorite,
  canBookTeam,
  canReserveRoom,
  recurringWeeks,
  setRecurringWeeks,
  showRecurring,
  setShowRecurring,
  reservationMode,
  setReservationMode,
  roomStartTime,
  setRoomStartTime,
  roomEndTime,
  setRoomEndTime,
}) {
  const image = DESK_IMAGES[desk.desk_type ?? ''] ?? DESK_IMAGES.default;
  const amenities = desk.amenities?.split(',').map((a) => a.trim()).filter(Boolean) ?? [];

  return (
    <div className="card-elevated flex w-full shrink-0 flex-col overflow-hidden xl:w-96">
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
        {desk.desk_type && <p className="text-sm text-slate-500">{desk.desk_type}</p>}

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
            {amenities.map((amenity) => (
              <li key={amenity} className="flex gap-3 text-sm">
                <span className="text-base">{AMENITY_ICONS[amenity] ?? '•'}</span>
                <span className="text-slate-700">{amenity}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <Calendar size={16} className="text-brand-600" />
          <span>
            Booking for <strong>{format(parseISO(date), 'EEEE, MMM d')}</strong>
          </span>
        </div>

        {desk.type === 'room' && canReserveRoom && (
          <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReservationMode('all_day')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  reservationMode === 'all_day'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                All day
              </button>
              <button
                type="button"
                onClick={() => setReservationMode('slot')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  reservationMode === 'slot'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Time slot
              </button>
            </div>
            {reservationMode === 'slot' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Start
                  </span>
                  <input
                    type="time"
                    value={roomStartTime}
                    onChange={(e) => setRoomStartTime(e.target.value)}
                    className="input-field"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    End
                  </span>
                  <input
                    type="time"
                    value={roomEndTime}
                    onChange={(e) => setRoomEndTime(e.target.value)}
                    className="input-field"
                  />
                </label>
              </div>
            )}
          </div>
        )}
        {desk.type === 'room' && !canReserveRoom && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Meeting rooms can only be reserved by team leaders and managers.
          </div>
        )}

        {desk.is_available && !desk.is_mine && (
          <button type="button" onClick={onBook} disabled={booking} className="btn-primary mt-4 w-full">
            <Calendar size={16} />
            {booking ? 'Reserving...' : 'Reserve Now'}
          </button>
        )}
        {desk.type === 'desk' && desk.is_available && !desk.is_mine && (
          <button
            type="button"
            onClick={() => setShowRecurring?.(true)}
            className="btn-secondary mt-2 w-full"
          >
            Recurring reservation
          </button>
        )}
        {canBookTeam && desk.type === 'desk' && (
          <button type="button" onClick={onBookTeam} className="btn-secondary mt-2 w-full">
            Book for Team
          </button>
        )}
        <button type="button" onClick={onMoreDetails} className="btn-secondary mt-2 w-full">
          More details
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={favoriteBusy}
          className="btn-secondary mt-2 w-full"
        >
          <Heart size={16} fill={desk.is_favorite ? 'currentColor' : 'none'} />
          {desk.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
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

        {showRecurring && desk.type === 'desk' && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900">Recurring reservation</h4>
            <p className="mt-1 text-xs text-slate-500">
              Repeat this desk weekly for your team or for yourself.
            </p>
            <div className="mt-3">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Repeat for</label>
              <select
                value={recurringWeeks}
                onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={0}>This week only</option>
                <option value={1}>2 weeks total</option>
                <option value={3}>4 weeks total</option>
                <option value={7}>8 weeks total</option>
              </select>
            </div>
            <button type="button" onClick={() => setShowRecurring?.(false)} className="mt-3 text-sm text-brand-600">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
