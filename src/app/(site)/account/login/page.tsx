import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-server";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string };
}) {
  const me = await getSessionUser();
  const returnTo = searchParams?.returnTo && decodeURIComponent(searchParams.returnTo);

  // Zaten girişliyse hedefe gönder
  if (me) {
    redirect(returnTo || "/account");
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Giriş Yap</h1>

      <LoginForm returnTo={returnTo} />

      <p className="text-sm text-gray-600">
        Hesabın yok mu?{" "}
        <Link
          href={
            returnTo
              ? `/account/register?returnTo=${encodeURIComponent(returnTo)}`
              : "/account/register"
          }
          className="text-primary underline-offset-2 hover:underline"
        >
          Kaydol
        </Link>
      </p>
    </div>
  );
}
