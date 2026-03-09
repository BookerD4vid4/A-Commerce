import type { ProductListItem } from "../../services/productService";
import ProductCard from "./ProductCard";
import { Package } from "lucide-react";

interface ProductListProps {
  products: ProductListItem[];
  isLoading?: boolean;
  onProductClick?: (productId: number) => void;
  onAddToCart?: (productId: number) => void;
}

export default function ProductList({
  products,
  isLoading = false,
  onProductClick,
  onAddToCart,
}: ProductListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-100 rounded-full w-1/3" />
              <div className="h-3.5 bg-gray-100 rounded-full w-4/5" />
              <div className="h-5 bg-gray-100 rounded-full w-1/2 mt-1" />
              <div className="h-9 bg-gray-100 rounded-xl mt-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-500 mb-1">
          ไม่พบสินค้า
        </h3>
        <p className="text-sm text-gray-400 text-center">
          ลองเปลี่ยนหมวดหมู่หรือค้นหาด้วยคำอื่น
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((product) => (
        <ProductCard
          key={product.product_id}
          product={product}
          onClick={onProductClick}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
