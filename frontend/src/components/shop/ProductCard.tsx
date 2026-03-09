import { ShoppingCart, Package } from "lucide-react";
import type { ProductListItem } from "../../services/productService";

interface ProductCardProps {
  product: ProductListItem;
  onAddToCart?: (productId: number) => void;
  onClick?: (productId: number) => void;
}

export default function ProductCard({
  product,
  onAddToCart,
  onClick,
}: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleCardClick = () => {
    onClick?.(product.product_id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product.product_id);
  };

  const isLowStock = product.total_stock > 0 && product.total_stock < 10;
  const isOutOfStock = product.total_stock === 0;

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer
        border border-gray-100 overflow-hidden group"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-200" />
          </div>
        )}

        {/* Stock badges */}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 bg-danger-500 text-white px-2 py-0.5 rounded-lg text-xs font-bold">
            หมดแล้ว
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2 left-2 bg-warning-500 text-white px-2 py-0.5 rounded-lg text-xs font-bold">
            เหลือน้อย
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60" />
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Category */}
        {product.category_name && (
          <p className="text-[10px] text-primary-500 font-semibold uppercase tracking-wide mb-0.5">
            {product.category_name}
          </p>
        )}

        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug mb-2">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mb-2.5">
          {product.min_price === product.max_price ? (
            <p className="text-lg font-bold text-primary-600">
              {formatPrice(product.min_price)}
            </p>
          ) : (
            <p className="text-sm font-bold text-primary-600">
              {formatPrice(product.min_price)} - {formatPrice(product.max_price)}
            </p>
          )}
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="w-full bg-primary-500 text-white py-2 px-3 rounded-xl text-sm font-semibold
            hover:bg-primary-600 active:bg-primary-700 focus:outline-none
            disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors
            flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="w-4 h-4" />
          {isOutOfStock ? "สินค้าหมด" : "หยิบใส่ตะกร้า"}
        </button>
      </div>
    </div>
  );
}
