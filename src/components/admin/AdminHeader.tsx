import Link from "next/link";

export default function AdminHeader({
  title,
  backHref = "/admin",
  backLabel = "Admin’e dön",
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <span aria-hidden>←</span> {backLabel}
      </Link>
    </div>
  );
}
