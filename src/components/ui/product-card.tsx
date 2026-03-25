import Image from "next/image";
import Link from "next/link";

type Props = {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency?: string;
  image?: string;
};

export default function ProductCard({
  slug,
  title,
  price,
  currency = "TRY",
  image,
}: Props) {
  return (
    <Link
      href={`/products/${slug}`}
      className="group block rounded-2xl border p-4 shadow-sm hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
        {image ? (
          <Image
            src={image}
            alt={title}
            width={600}
            height={600}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Görsel yok
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <h3 className="line-clamp-1 font-medium">{title}</h3>
        <span>
          {price.toFixed(2)} {currency}
        </span>
      </div>
    </Link>
  );
}
