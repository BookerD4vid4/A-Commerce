import { ShoppingCart, Check, Package } from "lucide-react";
import type { ChatProduct } from "../../services/chatService";

interface ChatOrderCardProps {
  product: ChatProduct;
  quantity: number;
  isAdded: boolean;
  onConfirmAdd: () => void;
}

export default function ChatOrderCard({
  product,
  quantity,
  isAdded,
  onConfirmAdd,
}: ChatOrderCardProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const unitPrice = product.min_price;
  const totalPrice = unitPrice * quantity;
  const isOutOfStock = product.total_stock === 0;

  return (
    <div className="bg-primary-50 rounded-xl p-3 border border-primary-100">
      {/* Product info */}
      <div className="flex gap-2.5">
        <div className="w-14 h-14 flex-shrink-0 bg-white rounded-lg overflow-hidden">
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
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 line-clamp-1">
            {product.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatPrice(unitPrice)} x {quantity}
          </p>
          <p className="text-sm font-bold text-primary-600 mt-0.5">
            {formatPrice(totalPrice)}
          </p>
        </div>
      </div>

      {/* Add to cart button */}
      {isOutOfStock ? (
        <div className="mt-2.5 text-center py-2 bg-gray-100 rounded-lg">
          <p className="text-xs text-gray-500 font-medium">สินค้าหมด</p>
        </div>
      ) : isAdded ? (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 py-2 bg-green-50 rounded-lg">
          <Check className="w-3.5 h-3.5 text-green-600" />
          <p className="text-xs text-green-600 font-semibold">
            เพิ่มในตะกร้าแล้ว
          </p>
        </div>
      ) : (
        <button
          onClick={onConfirmAdd}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">เพิ่มในตะกร้า</span>
        </button>
      )}
    </div>
  );
}
