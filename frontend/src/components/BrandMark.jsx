export default function BrandMark({ className = '', size = 40, showWordmark = false }) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-brand-600 text-white shadow-lg"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <defs>
            <linearGradient id="deskdibsMark" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#2684ff" />
              <stop offset="100%" stopColor="#0052cc" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="64" height="64" rx="18" fill="url(#deskdibsMark)" />
          <path
            d="M20 16h14c8 0 14 6 14 14s-6 14-14 14H20V16Zm8 8v12h6c4 0 6-3 6-6s-2-6-6-6h-6Z"
            fill="#ffffff"
          />
          <path
            d="M18 47h28"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>
      {showWordmark && (
        <div className="leading-tight">
          <div className="text-lg font-bold tracking-tight text-white">DeskDibs</div>
          <div className="text-[11px] text-brand-200">Hot-desking platform</div>
        </div>
      )}
    </div>
  );
}
