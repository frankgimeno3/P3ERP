export default function Cabezal() {
  return (
      <div className="flex flex-row justify-between">
        <div className="pt-2">
          <svg width="18" height="18" viewBox="0 0 72 72" className="block" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="72" height="72" rx="2" fill="#ffffff" />
            <rect x="0" y="0" width="18" height="72" fill="#d1d5db" />
            <rect x="18" y="0" width="54" height="12" fill="#e5e7eb" />
            <rect x="18" y="12" width="54" height="12" fill="#ffffff" />
            <rect x="18" y="24" width="54" height="12" fill="#ffffff" />
            <rect x="18" y="36" width="54" height="12" fill="#ffffff" />
            <rect x="18" y="48" width="54" height="12" fill="#ffffff" />
            <rect x="18" y="60" width="54" height="12" fill="#ffffff" />
            <rect x="0" y="0" width="18" height="12" fill="#d1d5db" />
            <rect x="0" y="12" width="18" height="12" fill="#d1d5db" />
            <rect x="0" y="24" width="18" height="12" fill="#d1d5db" />
            <rect x="0" y="36" width="18" height="12" fill="#d1d5db" />
            <rect x="0" y="48" width="18" height="12" fill="#d1d5db" />
            <rect x="0" y="60" width="18" height="12" fill="#d1d5db" />
          </svg>
        </div>

        <div className="mb-4 flex flex-row items-end justify-end pt-2">
          <button className="flex h-8 w-8 items-center justify-center rounded-sm border border-black text-lg font-bold text-black">
            −
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-sm border border-black text-lg font-bold text-black">
            □
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-sm border border-black bg-red-600 text-lg font-bold text-white">
            ×
          </button>
        </div>
      </div>
  );
}
