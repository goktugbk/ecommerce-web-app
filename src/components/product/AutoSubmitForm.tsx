"use client";
import { useRef } from "react";

export default function AutoSubmitForm({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const submitSoon = () => setTimeout(() => ref.current?.requestSubmit(), 10);
  return (
    <form ref={ref} method="GET" onChange={submitSoon} className="space-y-4">
      {children}
    </form>
  );
}
