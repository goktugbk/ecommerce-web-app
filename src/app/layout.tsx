import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/ui/LayoutShell";

export const metadata: Metadata = {
  title: "Mağaza",
  description: "El yapımı çantalar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tüm sayfalar bu shell ile sarılır; /checkout için header/footer gizlenecek
  return (
    <html lang="tr">
      <body className="bg-white text-black">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
