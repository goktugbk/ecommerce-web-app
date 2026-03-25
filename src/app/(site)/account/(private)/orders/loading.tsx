// src/app/(site)/account/(private)/orders/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-40 rounded bg-gray-200 animate-pulse" />
      <ul className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="rounded-2xl border bg-white/60 p-4 ring-1 ring-black/5"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="h-6 w-24 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 rounded-xl border bg-white/70 p-3"
                >
                  <div className="h-14 w-14 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 w-40 rounded bg-gray-200 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
