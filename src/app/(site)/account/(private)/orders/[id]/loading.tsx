// src/app/(site)/account/(private)/orders/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-64 rounded bg-gray-200 animate-pulse" />
        <div className="h-6 w-28 rounded-full bg-gray-200 animate-pulse" />
      </div>
      <div className="rounded-2xl border bg-white/60 p-4 ring-1 ring-black/5">
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-56 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
