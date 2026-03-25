"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  return (
    <section className="mx-auto my-12 max-w-7xl rounded-3xl bg-black px-6 py-10 text-white md:px-10">
      <h3 className="text-2xl font-semibold">
        Koleksiyonlardan ilk sen haberdar ol
      </h3>
      <p className="mt-1 text-white/70">Sürpriz lansmanlar, özel içerikler.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert(`Kaydedildi: ${email}`);
          setEmail("");
        }}
        className="mt-5 flex max-w-md gap-2"
      >
        <input
          type="email"
          required
          placeholder="e-posta adresin"
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 outline-none backdrop-blur placeholder-white/60"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button className="rounded-xl bg-white px-4 py-2 text-black hover:bg-white/90">
          Abone ol
        </Button>
      </form>
    </section>
  );
}
