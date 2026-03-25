// app/(site)/checkout/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import CheckoutSummary from "@/components/checkout/CheckoutSummary";
import { getSessionUser } from "@/lib/auth-server";
import { logoutAction } from "@/app/(site)/account/actions/auth";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type RawItem = any;

type CartApiOk = {
  ok: true;
  items: RawItem[];
  subtotal?: number;
  total?: number;
  currency?: string;
};
type CartApi = CartApiOk | { ok: false; message?: string; error?: string };

function getBaseUrl() {
  const h = headers();
  const host = h.get("host")!;
  const proto =
    process.env.VERCEL || process.env.NODE_ENV === "production" ? "https" : "http";
  return `${proto}://${host}`;
}

function serializeCookieHeader() {
  const store = cookies();
  const all = store.getAll();
  if (!all.length) return "";
  return all.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
}

function normalizeItem(it: any) {
  const title = it?.title ?? it?.product?.title ?? it?.name ?? "Ürün";
  const quantity = it?.quantity ?? 1;
  const priceRaw = it?.price ?? it?.unitPrice ?? it?.product?.price ?? 0;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
      ? Number(priceRaw)
      : typeof (priceRaw as any)?.toNumber === "function"
      ? Number((priceRaw as any).toNumber())
      : Number(priceRaw) || 0;

  const currency = it?.currency ?? it?.product?.currency ?? "TRY";

  return {
    id: String(it?.id ?? it?.productId ?? crypto.randomUUID()),
    title,
    price,
    quantity,
    currency,
  };
}

function maskEmail(email?: string | null) {
  if (!email) return "";
  const [u, d] = (email || "").split("@");
  if (!u || !d) return email || "";
  const mid = Math.max(u.length - 2, 1);
  return `${u[0]}${"*".repeat(mid)}${u.slice(-1)}@${d}`;
}

type Props = { searchParams: { id?: string; step?: string } };

const ADDR_COOKIE = "checkout_addr";

function readAddrDraftFromCookie() {
  const raw = cookies().get(ADDR_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as {
      firstName?: string;
      lastName?: string;
      line1?: string;
      line2?: string;
      city?: string;
      district?: string;
      postal?: string;
      phone?: string;
      email?: string;
    };
  } catch {
    return null;
  }
}

export default async function CheckoutPage({ searchParams }: Props) {
  const base = getBaseUrl();
  const cookieHeader = serializeCookieHeader();
  const sessionId = (searchParams.id ?? "").trim();

  const allowedSteps = new Set(["info", "shipping", "payment", "review"]);
  const step = allowedSteps.has((searchParams.step ?? "").trim())
    ? (searchParams.step as "info" | "shipping" | "payment" | "review")
    : "info";

  if (!sessionId) {
    try {
      const res = await fetch(`${base}/api/checkout/start`, {
        method: "POST",
        headers: { Cookie: cookieHeader, Accept: "application/json" },
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as
        | { ok: true; id: string; url: string }
        | null;

      if (!res.ok || !data || !data.ok) {
        redirect("/cart");
      }

      redirect(data.url); // /checkout?id=...&step=info
    } catch {
      redirect("/cart");
    }
  }

  const me = await getSessionUser();

  let items: ReturnType<typeof normalizeItem>[] = [];
  let subtotal = 0;
  let currency = "TRY";

  try {
    const res = await fetch(`${base}/api/cart`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json", Cookie: cookieHeader },
    });
    if ((res.headers.get("content-type") || "").includes("application/json")) {
      const data: CartApi | null = await res.json().catch(() => null);
      if (data && (data as any).ok && Array.isArray((data as CartApiOk).items)) {
        const raw = (data as CartApiOk).items;
        items = raw.map(normalizeItem);
        subtotal =
          (data as CartApiOk).subtotal ??
          (data as CartApiOk).total ??
          items.reduce((s, it) => s + it.price * it.quantity, 0);
        currency = (data as CartApiOk).currency ?? items[0]?.currency ?? "TRY";
      }
    }
  } catch {}

  let shippings: { id: string; name: string; fee: number }[] = [];
  let payments: { id: string; name: string }[] = [];

  try {
    const r = await fetch(`${base}/api/shipping-methods`, {
      cache: "no-store",
      headers: { Accept: "application/json", Cookie: cookieHeader },
    });
    if (r.ok) {
      shippings = (await r.json())?.shippings ?? [];
    }
  } catch {}
  try {
    const r = await fetch(`${base}/api/payment-methods`, {
      cache: "no-store",
      headers: { Accept: "application/json", Cookie: cookieHeader },
    });
    if (r.ok) {
      payments = (await r.json())?.payments ?? [];
    }
  } catch {}

  const firstName = me?.firstName ?? "";
  const lastName = me?.lastName ?? "";
  const email = me?.email ?? "";
  const phone = (me as any)?.phone || "";

  const initialAddrFromCookie = readAddrDraftFromCookie();

  // ✅ Varsayılan adres seçimi (User.defaultAddressId -> Address)
  let defaultAddr: any = null;
  if (me) {
    try {
      let addr =
        me.defaultAddressId
          ? await prisma.address.findFirst({
              where: { id: me.defaultAddressId, userId: me.id },
              select: {
                line1: true,
                line2: true,
                city: true,
                district: true,
                postalCode: true,
                country: true,
              },
            })
          : null;

      // Fallback: varsayılan yoksa en son eklenen adres
      if (!addr) {
        addr = await prisma.address.findFirst({
          where: { userId: me.id },
          orderBy: { createdAt: "desc" },
          select: {
            line1: true,
            line2: true,
            city: true,
            district: true,
            postalCode: true,
            country: true,
          },
        });
      }

      if (addr) {
        defaultAddr = {
          firstName,
          lastName,
          line1: addr.line1,
          line2: addr.line2 ?? "",
          city: addr.city,
          district: addr.district,
          postal: addr.postalCode ?? "",
          phone,
          saveForNext: true,
        };
      }
    } catch {}
  }

  const initialAddr = defaultAddr || initialAddrFromCookie || null;

  return (
    <div className="container mx-auto px-4">
      <div className="pt-6 pb-4">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-widest transition hover:opacity-80"
          aria-label="Ana sayfaya dön"
        >
          MANAV SEPETİM
        
        </Link>
      </div>

      <main className="mx-auto mt-4 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          {!me ? (
            <div className="mb-4 rounded-lg border p-3 text-sm">
              Zaten hesabınız var mı{" "}
              <Link
                href={`/account/login?returnTo=${encodeURIComponent(`/checkout?id=${sessionId}`)}`}
                className="font-medium underline"
              >
                Giriş Yap
              </Link>
              <span className="mx-2 text-neutral-400">•</span>
              <span>veya misafir olarak devam edin</span>
            </div>
          ) : (
            <div className="mb-4 flex items-start justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium">
                  {firstName} {lastName}
                </div>
                <div className="text-sm text-neutral-600">{maskEmail(email)}</div>
              </div>

              <form action={logoutAction} className="m-0">
                <input type="hidden" name="returnTo" value={`/checkout?id=${sessionId}`} />
                <Button
                  className="rounded-md border px-3 py-1.5 text-sm"
                  title="Bu hesaptan çık ve başka hesapla devam et"
                  variant="outline"
                  size="sm"
                >
                  Hesabı Değiştir
                </Button>
              </form>
            </div>
          )}

          <CheckoutForm
            items={items}
            subtotal={subtotal}
            shippings={shippings}
            payments={payments}
            sessionId={sessionId}
            step={step}
            initialAddr={initialAddr}
            defaultIdentity={me ? { firstName, lastName, phone } : undefined}
          />
        </section>

        <aside>
          <CheckoutSummary
            items={items}
            subtotal={subtotal}
            currency={currency}
            shippingFee={0}        // ücretsiz kargo seçiliyse 0
            paymentFee={0}         // ödeme ücreti yoksa 0
            discount={0}           // indirim varsa pozitif sayı ver (ör. 100)
            note="Kargo ücreti, kargo adımında seçiminize göre güncellenir."
          />
        </aside>
      </main>
    </div>
  );
}
