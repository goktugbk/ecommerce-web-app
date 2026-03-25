// src/lib/order-code.ts

export const ORDER_CODE_PREFIX = "ORD";

/** O/0, I/1, L yok — görsel karışıklığı azaltır */
const SAFE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Rastgele blok üretir (SAFE_ALPHABET) */
function randomBlock(len: number): string {
  let out = "";
  const n = SAFE_ALPHABET.length;
  for (let i = 0; i < len; i++) {
    const idx = Math.floor(Math.random() * n);
    out += SAFE_ALPHABET[idx];
  }
  return out;
}

/** Mod-97 checksum (IBAN benzeri). Harfleri base36 (A=10..Z=35) gibi sayıya çevirir. */
function mod97ChecksumBase36(input: string): number {
  // Her karakteri sayıya dönüştürüp string olarak birleştir (BigInt ile mod al)
  let numeric = "";
  for (const ch of input.toUpperCase()) {
    if (/[0-9]/.test(ch)) {
      numeric += ch;
    } else if (/[A-Z]/.test(ch)) {
      const v = ch.charCodeAt(0) - 55; // 'A'->10 ... 'Z'->35
      numeric += String(v);
    } // diğer karakterler yok sayılır (koddaki '-' gibi)
  }
  if (!numeric) return 0;

  // BigInt ile parça parça mod al (büyük sayıları güvenle işler)
  let rem = 0n;
  let chunk = "";
  for (const d of numeric) {
    chunk += d;
    // Çok uzarsa parçala
    if (chunk.length >= 9) {
      rem = (rem * 10n ** BigInt(chunk.length) + BigInt(chunk)) % 97n;
      chunk = "";
    }
  }
  if (chunk.length > 0) {
    rem = (rem * 10n ** BigInt(chunk.length) + BigInt(chunk)) % 97n;
  }

  // ISO 7064 benzeri 2 haneli kontrol değeri (00-96)
  return Number(rem);
}

/** İki haneli sıfır doldurma */
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export type OrderCodeOptions = {
  prefix?: string; // default: "ORD"
  date?: Date; // default: now
  blockLen?: number; // default: 6
};

/**
 * Sipariş kodu üretir. Örn: ORD-2025-AX7Q9M-42
 */
export function generateOrderCode(options: OrderCodeOptions = {}): string {
  const {
    prefix = ORDER_CODE_PREFIX,
    date = new Date(),
    blockLen = 6,
  } = options;

  const year = date.getFullYear();
  const block = randomBlock(blockLen);

  // Checksum girdisi: PREFIX + YEAR + BLOCK (delimiter'lar hariç)
  const raw = `${prefix}${year}${block}`;
  const mod = mod97ChecksumBase36(raw);
  const check = pad2(mod); // 00..96

  return `${prefix}-${year}-${block}-${check}`;
}

/**
 * Sipariş kodu geçerliyse true. Prefix ve checksum kontrolü yapar.
 */
export function isValidOrderCode(
  code: string,
  prefix: string = ORDER_CODE_PREFIX,
): boolean {
  const re = new RegExp(`^${prefix}-\\d{4}-[A-Z0-9]{4,10}-\\d{2}$`, "i");
  if (!re.test(code)) return false;

  const [pfx, year, block, chk] = code.split("-");
  if (!pfx || !year || !block || !chk) return false;

  const expected = pad2(mod97ChecksumBase36(`${pfx}${year}${block}`));
  return expected === chk;
}

/**
 * Benzersizlik kontrolü ile tekrar deneme yapan üretici.
 * `isUnique` fonksiyonu, üretilen kodun DB'de var olup olmadığını async döner.
 */
export async function generateOrderCodeWithRetry(
  isUnique: (code: string) => Promise<boolean>,
  options?: OrderCodeOptions,
  maxAttempts = 5,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateOrderCode(options);
    if (await isUnique(code)) return code;
  }
  // Çok nadir de olsa üst üste çakışırsa block uzunluğunu artırıp son bir kez dene
  const fallback = generateOrderCode({
    ...(options || {}),
    blockLen: (options?.blockLen ?? 6) + 2,
  });
  if (await isUnique(fallback)) return fallback;
  // Hâlâ çakışırsa yine de döndür (DB'deki UNIQUE constraint kesin güvence)
  return fallback;
}
