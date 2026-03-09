import { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Package,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import api from "../../services/api";
import { adminService } from "../../services/adminService";
import type {
  AdminProductListItem,
  AdminProductDetail,
} from "../../services/adminService";
import { productService } from "../../services/productService";
import type { Category } from "../../services/productService";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

// =============================================
// Variant Form Row
// =============================================
interface VariantFormData {
  _key: string; // client-side key for React
  variant_id?: number;
  sku: string;
  price: string;
  stock_quantity: string;
  image_url: string;
  unit: string;
  size: string;
  color: string;
}

function emptyVariant(): VariantFormData {
  return {
    _key: `v_${Date.now()}_${Math.random()}`,
    sku: "",
    price: "",
    stock_quantity: "0",
    image_url: "",
    unit: "",
    size: "",
    color: "",
  };
}

// =============================================
// Variant Image Upload
// =============================================
function VariantImageUpload({
  imageUrl,
  onUploaded,
  onClear,
}: {
  imageUrl: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/uploads/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded(res.data.url);
    } catch {
      alert("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (imageUrl) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <img
          src={imageUrl}
          alt="preview"
          className="w-14 h-14 rounded-lg object-cover border border-gray-200"
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-[11px] text-primary-600 hover:underline"
          >
            {uploading ? "กำลังอัปโหลด..." : "เปลี่ยนรูป"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-red-500 hover:underline"
          >
            ลบรูป
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors w-full"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        <span>{uploading ? "กำลังอัปโหลด..." : "เลือกรูปภาพ"}</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}

// =============================================
// Product Modal
// =============================================
interface ProductModalProps {
  product: AdminProductDetail | null; // null = create mode
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

function ProductModal({ product, categories, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [marketingCopy, setMarketingCopy] = useState(product?.marketing_copy || "");
  const [categoryId, setCategoryId] = useState<string>(
    product?.category_id ? String(product.category_id) : ""
  );
  const [variants, setVariants] = useState<VariantFormData[]>(() => {
    if (product && product.variants.length > 0) {
      return product.variants.map((v) => ({
        _key: `v_${v.variant_id}`,
        variant_id: v.variant_id,
        sku: v.sku || "",
        price: String(v.price),
        stock_quantity: String(v.stock_quantity),
        image_url: v.image_url || "",
        unit: v.unit || "",
        size: v.size || "",
        color: v.color || "",
      }));
    }
    return [emptyVariant()];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addVariant = () => setVariants((prev) => [...prev, emptyVariant()]);

  const removeVariant = (key: string) => {
    setVariants((prev) => prev.filter((v) => v._key !== key));
  };

  const updateVariant = (key: string, field: keyof VariantFormData, value: string) => {
    setVariants((prev) =>
      prev.map((v) => (v._key === key ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("กรุณากรอกชื่อสินค้า");
      return;
    }

    // Validate at least one variant with price
    const validVariants = variants.filter((v) => v.price && Number(v.price) > 0);
    if (validVariants.length === 0) {
      setError("กรุณาเพิ่มอย่างน้อย 1 ตัวเลือกสินค้าพร้อมราคา");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        // Update product
        await adminService.updateProduct(product!.product_id, {
          name: name.trim(),
          description: description.trim() || undefined,
          marketing_copy: marketingCopy.trim() || undefined,
          category_id: categoryId ? Number(categoryId) : undefined,
        });

        // Handle variants: update existing, create new
        for (const v of variants) {
          const variantData = {
            sku: v.sku.trim() || undefined,
            price: Number(v.price),
            stock_quantity: Number(v.stock_quantity) || 0,
            image_url: v.image_url.trim() || undefined,
            unit: v.unit.trim() || undefined,
            size: v.size.trim() || undefined,
            color: v.color.trim() || undefined,
          };

          if (v.variant_id) {
            await adminService.updateVariant(v.variant_id, variantData);
          } else {
            await adminService.createVariant(product!.product_id, variantData);
          }
        }

        // Delete removed variants
        const currentIds = new Set(variants.filter((v) => v.variant_id).map((v) => v.variant_id));
        for (const origVariant of product!.variants) {
          if (!currentIds.has(origVariant.variant_id)) {
            await adminService.deleteVariant(origVariant.variant_id);
          }
        }
      } else {
        // Create product with variants
        await adminService.createProduct({
          name: name.trim(),
          description: description.trim() || undefined,
          marketing_copy: marketingCopy.trim() || undefined,
          category_id: categoryId ? Number(categoryId) : undefined,
          variants: validVariants.map((v) => ({
            sku: v.sku.trim() || undefined,
            price: Number(v.price),
            stock_quantity: Number(v.stock_quantity) || 0,
            image_url: v.image_url.trim() || undefined,
            unit: v.unit.trim() || undefined,
            size: v.size.trim() || undefined,
            color: v.color.trim() || undefined,
          })),
        });
      }

      onSaved();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Product Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อสินค้า *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="เช่น น้ำดื่มตราสิงห์"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมวดหมู่
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="">-- ไม่ระบุ --</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รายละเอียด
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                placeholder="คำอธิบายสินค้า..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                คำโฆษณา (Marketing)
              </label>
              <textarea
                value={marketingCopy}
                onChange={(e) => setMarketingCopy(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                placeholder="คำโปรโมทสินค้า..."
              />
            </div>
          </div>

          {/* Variants Section */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">
                ตัวเลือกสินค้า (Variants)
              </h3>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่มตัวเลือก
              </button>
            </div>

            <div className="space-y-3">
              {variants.map((v, idx) => (
                <div
                  key={v._key}
                  className="bg-gray-50 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">
                      ตัวเลือก #{idx + 1}
                      {v.variant_id ? ` (ID: ${v.variant_id})` : " (ใหม่)"}
                    </span>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(v._key)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500">ราคา (บาท) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.price}
                        onChange={(e) => updateVariant(v._key, "price", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">สต็อก</label>
                      <input
                        type="number"
                        min="0"
                        value={v.stock_quantity}
                        onChange={(e) =>
                          updateVariant(v._key, "stock_quantity", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">SKU</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariant(v._key, "sku", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">หน่วย</label>
                      <input
                        type="text"
                        value={v.unit}
                        onChange={(e) => updateVariant(v._key, "unit", e.target.value)}
                        placeholder="ชิ้น, กล่อง, ขวด"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">ขนาด</label>
                      <input
                        type="text"
                        value={v.size}
                        onChange={(e) => updateVariant(v._key, "size", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">สี</label>
                      <input
                        type="text"
                        value={v.color}
                        onChange={(e) => updateVariant(v._key, "color", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">รูปภาพ</label>
                    <VariantImageUpload
                      imageUrl={v.image_url}
                      onUploaded={(url) => updateVariant(v._key, "image_url", url)}
                      onClear={() => updateVariant(v._key, "image_url", "")}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "บันทึก" : "เพิ่มสินค้า"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// Main Page
// =============================================
export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toggling, setToggling] = useState<number | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<AdminProductDetail | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, filterCategory]);

  const loadProducts = async (searchTerm?: string) => {
    try {
      setLoading(true);
      const data = await adminService.getProducts({
        page,
        search: (searchTerm ?? search) || undefined,
        category_id: filterCategory ? Number(filterCategory) : undefined,
      });
      setProducts(data.products);
      setTotal(data.total);
    } catch {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts(search);
  };

  const toggleActive = async (productId: number, currentActive: boolean) => {
    try {
      setToggling(productId);
      await adminService.updateProduct(productId, { is_active: !currentActive });
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === productId ? { ...p, is_active: !currentActive } : p
        )
      );
    } catch {
      alert("ไม่สามารถอัปเดตได้");
    } finally {
      setToggling(null);
    }
  };

  const handleEdit = async (productId: number) => {
    try {
      setLoadingEdit(true);
      const detail = await adminService.getProduct(productId);
      setEditProduct(detail);
      setShowModal(true);
    } catch {
      alert("ไม่สามารถโหลดข้อมูลสินค้าได้");
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (productId: number, name: string) => {
    if (!confirm(`ต้องการลบ "${name}" หรือไม่?`)) return;
    try {
      await adminService.deleteProduct(productId);
      loadProducts();
    } catch {
      alert("ไม่สามารถลบได้");
    }
  };

  const handleCreate = () => {
    setEditProduct(null);
    setShowModal(true);
  };

  const handleModalSaved = () => {
    setShowModal(false);
    setEditProduct(null);
    loadProducts();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">จัดการสินค้า</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          เพิ่มสินค้า
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            ค้นหา
          </button>
        </form>

        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">ไม่พบสินค้า</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">สินค้า</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">
                    หมวดหมู่
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">ราคา</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">สต็อก</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">สถานะ</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.product_id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">
                            {p.variant_count} ตัวเลือก
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {p.category_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {p.min_price != null
                        ? p.min_price === p.max_price
                          ? formatPrice(p.min_price)
                          : `${formatPrice(p.min_price)} - ${formatPrice(p.max_price!)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          p.total_stock < 10
                            ? "text-red-500"
                            : "text-gray-600"
                        }`}
                      >
                        {p.total_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(p.product_id, p.is_active)}
                        disabled={toggling === p.product_id}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          p.is_active ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            p.is_active ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(p.product_id)}
                          disabled={loadingEdit}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.product_id, p.name)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            แสดง {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} จาก{" "}
            {total} รายการ
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-700">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditProduct(null);
          }}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
