"use client";

export type SwatchItem = { id: string; hex: string; name?: string };

/**
 * Non-native color swatch grid — deliberately avoids <input type="color">.
 * Multiple native color wells mounted at once (one per brand.colors entry)
 * is the suspected cause of the iOS Safari "This page couldn't load" crash
 * on the Brand page; this is plain divs/buttons instead.
 */
export function ColorSwatchGrid({
  items,
  selectedId,
  onSelect,
  isDisabled,
  size = 22,
}: {
  items: SwatchItem[];
  selectedId?: string;
  onSelect: (item: SwatchItem) => void;
  isDisabled?: (item: SwatchItem) => boolean;
  size?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const disabled = isDisabled?.(item) ?? false;
        const selected = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.name ?? item.hex}
            disabled={disabled}
            onClick={() => onSelect(item)}
            className="rounded-full"
            style={{
              width: size,
              height: size,
              background: item.hex,
              border: selected ? "2px solid #f2f1ed" : "1px solid #ffffff33",
              opacity: disabled ? 0.25 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

/** Curated preset palette for picking an arbitrary brand color without a native color well. */
export const PRESET_BRAND_SWATCHES: SwatchItem[] = [
  { id: "preset-black", hex: "#0C0D0F", name: "Black" },
  { id: "preset-charcoal", hex: "#1F2225", name: "Charcoal" },
  { id: "preset-gray", hex: "#6D758F", name: "Gray" },
  { id: "preset-white", hex: "#F2F1ED", name: "White" },
  { id: "preset-red", hex: "#C0392B", name: "Red" },
  { id: "preset-orange", hex: "#E67E22", name: "Orange" },
  { id: "preset-amber", hex: "#E6B84D", name: "Amber" },
  { id: "preset-yellow", hex: "#F1C40F", name: "Yellow" },
  { id: "preset-lime", hex: "#B7E46C", name: "Lime" },
  { id: "preset-green", hex: "#2E7D5B", name: "Green" },
  { id: "preset-teal", hex: "#149A9B", name: "Teal" },
  { id: "preset-blue", hex: "#2E6FE6", name: "Blue" },
  { id: "preset-navy", hex: "#19213D", name: "Navy" },
  { id: "preset-purple", hex: "#7B5EA7", name: "Purple" },
  { id: "preset-pink", hex: "#D46A9F", name: "Pink" },
  { id: "preset-brown", hex: "#5A3E2B", name: "Brown" },
];
