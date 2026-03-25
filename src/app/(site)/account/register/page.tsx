import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-server";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string };
}) {
  const me = await getSessionUser();
  const returnTo = searchParams?.returnTo && decodeURIComponent(searchParams.returnTo);

  // Kullanıcı zaten girişliyse —> hedefe
  if (me) {
    redirect(returnTo || "/account");
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Kaydol</h1>

      <RegisterForm returnTo={returnTo} />

      <p className="text-sm text-gray-600">
        Zaten hesabın var mı?{" "}
        <Link
          href={
            returnTo
              ? `/account/login?returnTo=${encodeURIComponent(returnTo)}`
              : "/account/login"
          }
          className="text-primary underline-offset-2 hover:underline"
        >
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
