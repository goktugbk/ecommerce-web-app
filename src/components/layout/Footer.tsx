export default function Footer() {
  return (
    <footer className="bg-black text-gray-300 mt-12">
      {/* Üst kısım */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
        {/* Kategoriler */}
        <div>
          <h3 className="font-semibold mb-3 text-white">Kategoriler</h3>
          <ul className="space-y-2">
            <li>
              <a href="#" className="hover:text-white">
                Yeni Koleksiyon!
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                T-shirt
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Hoodie
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Eşofman Altı
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Dış Giyim
              </a>
            </li>
          </ul>
        </div>

        {/* Hesabım */}
        <div>
          <h3 className="font-semibold mb-3 text-white">Hesabım</h3>
          <ul className="space-y-2">
            <li>
              <a href="/account/login" className="hover:text-white">
                Giriş Yap
              </a>
            </li>
            <li>
              <a href="/account/register" className="hover:text-white">
                Kayıt Ol
              </a>
            </li>
          </ul>
        </div>

        {/* Hakkımızda */}
        <div>
          <h3 className="font-semibold mb-3 text-white">Hakkımızda</h3>
          <ul className="space-y-2">
            <li>
              <a href="/contact" className="hover:text-white">
                İletişim
              </a>
            </li>
            <li>
              <a href="/faq" className="hover:text-white">
                Sıkça Sorulan Sorular
              </a>
            </li>
          </ul>
        </div>

        {/* Destek */}
        <div>
          <h3 className="font-semibold mb-3 text-white">Destek</h3>
          <ul className="space-y-2">
            <li>
              <a href="#" className="hover:text-white">
                Kargo ve İade
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Beden Tablosu
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Aydınlatma Metni
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Kullanıcı Sözleşmesi
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Mesafeli Satış Sözleşmesi
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Tüketici Hakları – Cayma – İptal İade
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Alt bar */}
      <div className="border-t border-gray-700 py-6 text-xs">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400">© 2024 – Çantacım®</p>

          {/* Sosyal medya */}
          <div className="flex gap-4 text-lg">
            <a href="#" className="hover:text-white">
              <span className="sr-only">Instagram</span>📷
            </a>
            <a href="#" className="hover:text-white">
              <span className="sr-only">Twitter</span>✖️
            </a>
          </div>

          {/* Ödeme ikonları */}
          <div className="flex gap-2 items-center">
            <img src="/visa.svg" alt="Visa" className="h-6" />
            <img src="/mastercard.svg" alt="Mastercard" className="h-6" />
            <img src="/amex.svg" alt="Amex" className="h-6" />
          </div>
        </div>
      </div>
    </footer>
  );
}
