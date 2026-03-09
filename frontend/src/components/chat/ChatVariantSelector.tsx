import { useState } from "react";
import { ShoppingCart, Package, Check, Loader2 } from "lucide-react";
import type { ChatProduct, ChatVariant } from "../../services/chatService";

interface ChatVariantSelectorProps {
  product: ChatProduct;
  variants: ChatVariant[];
  onSelectVariant: (variantId: number, product: ChatProduct, variant: ChatVariant) => void;
  isTestMode?: boolean;
  addedVariantIds?: Set<number>;
  loadingVariantId?: number | null;
  isLatest?: boolean;
}

export default function ChatVariantSelector({
  product,
  variants,
  onSelectVariant,
  isTestMode = false,
  addedVariantIds,
  loadingVariantId,
  isLatest = true,
}: ChatVariantSelectorProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const getVariantLabel = (v: ChatVariant) => {
    const parts: string[] = [];
    if (v.size) parts.push(v.size);
    if (v.unit) parts.push(v.unit);
    if (v.color) parts.push(v.color);
    return parts.length > 0 ? parts.join(" / ") : v.sku || `#${v.variant_id}`;
  };

  const inStockVariants = variants.filter((v) => v.stock_quantity > 0);

  return (
    <div className="bg-primary-50 rounded-xl p-3 border border-primary-100">
      {/* Product header */}
      <div className="flex gap-2.5 mb-2.5">
        <div className="w-12 h-12 flex-shrink-0 bg-white rounded-lg overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-200" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 line-clamp-1">{product.name}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">กรุณาเลือกขนาด</p>
        </div>
      </div>

      {/* Variant options */}
      <div className="space-y-1.5">
        {inStockVariants.map((v) => {
          const isAdded = addedVariantIds?.has(v.variant_id);
          const isLoading = loadingVariantId === v.variant_id;
          const isSelected = selectedId === v.variant_id;

          return (
            <button
              key={v.variant_id}
              onClick={() => {
                if (isAdded || isLoading) return;
                setSelectedId(v.variant_id);
                onSelectVariant(v.variant_id, product, v);
              }}
              disabled={isAdded || isLoading || !isLatest}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                isAdded
                  ? "bg-green-50 border border-green-200"
                  : isSelected
                  ? "bg-primary-100 border border-primary-300"
                  : "bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {v.image_url && (
                  <img src={v.image_url} alt="" className="w-6 h-6 rounded object-cover" />
                )}
                <span className="font-medium text-gray-800">{getVariantLabel(v)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary-600">{formatPrice(v.price)}</span>
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin" />
                ) : isAdded ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <ShoppingCart className="w-3.5 h-3.5 text-primary-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {isTestMode && (
        <p className="text-[10px] text-yellow-600 mt-2 text-center">
          โหมดทดสอบ - ไม่ได้เพิ่มสินค้าลงตะกร้าจริง
        </p>
      )}
    </div>
  );
}
