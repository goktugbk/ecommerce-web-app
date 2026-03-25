import { Button } from "@/components/ui/Button";

// src/components/product/ProductsFilters.tsx

type Props = {
  categories: { id: string; name: string; slug: string }[];
  currentQ: string;
  currentCategorySlug: string;
  currentSort: string;
};

export default function ProductsFilters({
  categories,
  currentQ,
  currentCategorySlug,
  currentSort,
}: Props) {
  return (
    <aside className="border rounded-xl p-4 sticky top-4 h-fit">
      <form method="GET" className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ara</label>
          <input
            type="text"
            name="q"
            defaultValue={currentQ}
            placeholder="Ürün adı"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Kategoriler</div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="category"
                value="all"
                defaultChecked={currentCategorySlug === "all"}
              />
              <span>Tümü</span>
            </label>
            {categories.map((c) => (
              <label key={c.id} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="category"
                  value={c.slug}
                  defaultChecked={currentCategorySlug === c.slug}
                />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Sırala</label>
          <select
            name="sort"
            defaultValue={currentSort || "new"}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="new">En yeni</option>
            <option value="price_asc">Fiyat (artan)</option>
            <option value="price_desc">Fiyat (azalan)</option>
            <option value="name_asc">İsim (A→Z)</option>
          </select>
        </div>

        <Button
          type="submit"
          className="w-full rounded-md bg-black text-white py-2"
          variant="default"
        >
          Uygula
        </Button>
      </form>
    </aside>
  );
}
