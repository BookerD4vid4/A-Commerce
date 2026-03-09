import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  productService,
} from "../services/productService";
import type { ProductListItem, Category } from "../services/productService";
import ProductList from "../components/shop/ProductList";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToCart, addToGuestCart, openCart } = useCartStore();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery]);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await productService.getProducts({
        category_id: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setProducts(data);
    } catch (err) {
      setError("ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (productId: number) => {
    console.log("View product:", productId);
  };

  const handleAddToCart = async (productId: number) => {
    const product = products.find((p) => p.product_id === productId);
    if (!product) return;

    try {
      const productDetail = await productService.getProductDetail(productId);
      const firstVariant = productDetail.variants.find((v) => v.is_active && v.stock_quantity > 0);

      if (!firstVariant) {
        alert("สินค้าหมดสต็อก");
        return;
      }

      if (isAuthenticated) {
        await addToCart(firstVariant.variant_id, 1);
      } else {
        addToGuestCart(firstVariant.variant_id, 1);
      }

      openCart();
    } catch (error: any) {
      alert(error.response?.data?.detail || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const mainCategories = categories.filter((c) => c.parent_id === null);
  const catScrollRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-4 pt-6 pb-10 -mt-[1px]">
        <div className="text-center mb-6">
          <h2 className="text-white text-xl font-bold mb-1">
            ยินดีต้อนรับสู่ร้านโชห่วย ABC
          </h2>
          <p className="text-primary-100 text-sm">
            สินค้าครบ จัดส่งไว ราคาดี
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl shadow-lg text-base focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </form>
      </div>

      {/* Category Chips with Arrow Buttons */}
      <div className="relative -mt-5 flex items-center">
        {/* Left Arrow */}
        <button
          onClick={() => {
            const el = catScrollRef.current;
            if (el) el.scrollBy({ left: -200, behavior: "smooth" });
          }}
          className="absolute left-0 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center text-gray-500 hover:text-primary-600 hover:shadow-lg transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={catScrollRef}
          className="flex gap-2 overflow-x-auto pb-2 px-10 no-scrollbar scroll-smooth"
        >
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
              selectedCategory === null
                ? "bg-primary-500 text-white shadow-primary-500/30"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            ทั้งหมด
          </button>
          {mainCategories.map((category) => (
            <button
              key={category.category_id}
              onClick={() => setSelectedCategory(category.category_id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                selectedCategory === category.category_id
                  ? "bg-primary-500 text-white shadow-primary-500/30"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => {
            const el = catScrollRef.current;
            if (el) el.scrollBy({ left: 200, behavior: "smooth" });
          }}
          className="absolute right-0 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center text-gray-500 hover:text-primary-600 hover:shadow-lg transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-6">
        {/* Results info */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              พบ <span className="font-semibold text-gray-700">{products.length}</span> รายการ
              {selectedCategory && (
                <span>
                  {" "}ในหมวด{" "}
                  <span className="font-semibold text-primary-600">
                    {categories.find((c) => c.category_id === selectedCategory)?.name}
                  </span>
                </span>
              )}
            </p>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-primary-600 font-medium hover:underline"
              >
                ดูทั้งหมด
              </button>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-danger-50 border border-danger-200 rounded-2xl p-4 mb-6">
            <p className="text-danger-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Product list */}
        {!isLoading && (
          <ProductList
            products={products}
            isLoading={isLoading}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
          />
        )}
      </div>
    </div>
  );
}
