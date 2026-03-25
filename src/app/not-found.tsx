export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-6 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="text-gray-600">Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <a href="/" className="rounded-lg px-4 py-2 border inline-block">Ana sayfa</a>
    </main>
  );
}
