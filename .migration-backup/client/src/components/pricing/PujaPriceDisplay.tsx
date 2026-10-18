const money = (value: number) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function PujaPriceDisplay({basePrice, salePrice, fallbackPrice}: {
  basePrice?: number | null;
  salePrice?: number | null;
  fallbackPrice: number;
}) {
  const hasSale = salePrice !== null && salePrice !== undefined;
  return <span className="inline-flex flex-wrap items-baseline justify-end gap-x-2">
    {hasSale && basePrice !== null && basePrice !== undefined &&
      <del className="text-muted-foreground text-sm font-normal" aria-label="Base price">{money(basePrice)}</del>}
    <span className="font-medium" aria-label={hasSale ? 'Sale price' : 'Puja price'}>{money(hasSale ? salePrice : fallbackPrice)}</span>
  </span>;
}
