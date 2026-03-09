import { ShoppingCart, Package, Loader2 } from "lucide-react";
import type { ChatProduct } from "../../services/chatService";

interface ChatProductCardProps {
  product: ChatProduct;
  onAddToCart?: (productId: number, variantId?: number) => void;
  loading?: boolean;
}

export default function ChatProductCard({ product, onAddToCart, loading = false }: ChatProductCardProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const isOutOfStock = product.total_stock === 0;

  return (
    <div className="flex gap-2.5 bg-white rounded-xl p-2.5 border border-gray-100">
      {/* Image */}
      <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-6 h-6 text-gray-200" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 line-clamp-1">{product.name}</p>
        <p className="text-xs font-bold text-primary-600 mt-0.5">
          {formatPrice(product.min_price)}
        </p>
        {product.unit && (
          <p className="text-[10px] text-gray-400 mt-0.5">/{product.unit}</p>
        )}
        {isOutOfStock && (
          <p className="text-[10px] text-danger-500 font-medium mt-0.5">สินค้าหมด</p>
        )}
      </div>

      {/* Add to cart */}
      {onAddToCart && !isOutOfStock && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!loading) onAddToCart(product.product_id, product.variant_id ?? undefined);
          }}
          disabled={loading}
          className="self-center flex-shrink-0 w-8 h-8 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-lg flex items-center justify-center transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShoppingCart className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
