"use client";

import { ProductItem } from "@/types/dashboard";
import AssetImage from "@/components/ui/AssetImage";
import { cn } from "@/lib/utils";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { formatFcfa } from "@/lib/utils";

interface BestSellersTableProps {
  products: ProductItem[];
}

export default function BestSellersTable({ products }: BestSellersTableProps) {
  return (
    <DashboardCard className="p-6">
      <CardHeader
        title="Meilleures Ventes du Mois"
        subtitle="Articles générant le plus de chiffre d'affaires"
        action={
          <button className="rounded-xl border border-blue-100 bg-blue-100/40 px-3 py-1.5 font-mono text-xs font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-100/70">
            Tout afficher
          </button>
        }
      />

      {/* Table Container */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs text-ink-700">
          <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-2 py-3">PRODUIT</th>
              <th className="px-2 py-3">CATÉGORIE</th>
              <th className="px-2 py-3 text-right">PRIX (FCFA)</th>
              <th className="px-2 py-3 text-right">VENTES</th>
              <th className="px-2 py-3 text-right">REVENU TOTAL</th>
              <th className="px-2 py-3 text-center">NOTE</th>
              <th className="px-2 py-3 text-center">STOCK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70 font-sans">
            {products.map((prod) => (
              <tr key={prod.id} className="group transition-colors hover:bg-ink-50/70">
                {/* Product Name & Image */}
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-line bg-ink-50">
                      <AssetImage
                        src={prod.image}
                        alt={prod.name}
                        sizes="40px"
                        label="Produit"
                      />
                    </div>
                    <span className="font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                      {prod.name}
                    </span>
                  </div>
                </td>

                {/* Category */}
                <td className="px-2 py-3 font-mono text-[11px] text-ink-500">{prod.category}</td>

                {/* Price */}
                <td className="px-2 py-3 text-right font-mono font-medium text-ink-950">
                  {formatFcfa(prod.priceFcfa)}
                </td>

                {/* Sales Count */}
                <td className="px-2 py-3 text-right font-mono font-semibold text-gold-strong">
                  {prod.salesCount.toLocaleString()}
                </td>

                {/* Total Revenue */}
                <td className="px-2 py-3 text-right font-mono font-bold text-ink-950">
                  {formatFcfa(prod.revenueFcfa)}
                </td>

                {/* Rating */}
                <td className="px-2 py-3 text-center">
                  <span className="inline-flex items-center gap-1 rounded-md bg-gold-wash px-2 py-0.5 font-mono text-[11px] font-semibold text-gold-strong">
                    ★ {prod.rating.toFixed(1)}
                  </span>
                </td>

                {/* Stock Status */}
                <td className="px-2 py-3 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold",
                      prod.status === "in_stock" && "bg-green-100 text-green-700",
                      prod.status === "low_stock" && "bg-gold-wash text-gold-strong",
                      prod.status === "out_of_stock" && "bg-red-100 text-red-600"
                    )}
                  >
                    {prod.status === "in_stock" && `En stock (${prod.stock})`}
                    {prod.status === "low_stock" && `Stock bas (${prod.stock})`}
                    {prod.status === "out_of_stock" && "Rupture"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
