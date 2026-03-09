import { useState, useEffect } from "react";
import { Loader2, Save, RefreshCw, Plus } from "lucide-react";
import { adminService } from "../../services/adminService";
import type { ChatbotPrompt } from "../../services/adminService";

const PROMPT_TYPE_LABELS: Record<string, string> = {
  system: "System Prompt",
  category: "Category",
  product_specific: "Product",
};

export default function ChatbotSettingsPage() {
  const [prompts, setPrompts] = useState<ChatbotPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ prompt_type: "system", prompt_text: "" });

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await adminService.getPrompts();
      setPrompts(data);
    } catch {
      console.error("Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (prompt: ChatbotPrompt) => {
    setEditingId(prompt.prompt_id);
    setEditText(prompt.prompt_text);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      setSaving(editingId);
      await adminService.updatePrompt(editingId, editText);
      setPrompts((prev) =>
        prev.map((p) =>
          p.prompt_id === editingId ? { ...p, prompt_text: editText } : p
        )
      );
      setEditingId(null);
    } catch {
      alert("ไม่สามารถบันทึกได้");
    } finally {
      setSaving(null);
    }
  };

  const createPrompt = async () => {
    if (!newPrompt.prompt_text.trim()) return;
    try {
      setSaving(-1);
      const created = await adminService.createPrompt(newPrompt);
      setPrompts((prev) => [...prev, created]);
      setShowNew(false);
      setNewPrompt({ prompt_type: "system", prompt_text: "" });
    } catch {
      alert("ไม่สามารถสร้างได้");
    } finally {
      setSaving(null);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("ต้องการสร้าง embeddings ใหม่ทั้งหมด?")) return;
    try {
      setRegenerating(true);
      setRegenerateResult("");
      const result = await adminService.regenerateEmbeddings();
      setRegenerateResult(
        `สำเร็จ: ${result.created || 0} สร้างใหม่, ${result.updated || 0} อัปเดต, ${result.errors || 0} ข้อผิดพลาด`
      );
    } catch {
      setRegenerateResult("เกิดข้อผิดพลาด");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const systemPrompt = prompts.find((p) => p.prompt_type === "system");
  const otherPrompts = prompts.filter((p) => p.prompt_type !== "system");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ตั้งค่าแชทบอท</h1>

      {/* System Prompt */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-3">System Prompt หลัก</h2>
        <p className="text-xs text-gray-400 mb-3">
          คำสั่งหลักที่ควบคุมพฤติกรรมของ AI chatbot
        </p>
        {systemPrompt ? (
          editingId === systemPrompt.prompt_id ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving === systemPrompt.prompt_id}
                  className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving === systemPrompt.prompt_id ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
                {systemPrompt.prompt_text}
              </pre>
              <button
                onClick={() => startEdit(systemPrompt)}
                className="mt-3 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-semibold hover:bg-primary-100"
              >
                แก้ไข
              </button>
            </div>
          )
        ) : (
          <p className="text-sm text-gray-400">ยังไม่มี system prompt</p>
        )}
      </div>

      {/* Other Prompts */}
      {otherPrompts.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Prompt อื่นๆ</h2>
          <div className="space-y-3">
            {otherPrompts.map((prompt) => (
              <div key={prompt.prompt_id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                    {PROMPT_TYPE_LABELS[prompt.prompt_type] || prompt.prompt_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${prompt.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                    {prompt.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {editingId === prompt.prompt_id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={saving === prompt.prompt_id}
                        className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-semibold"
                      >
                        {saving === prompt.prompt_id ? "..." : "บันทึก"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 line-clamp-3">{prompt.prompt_text}</p>
                    <button
                      onClick={() => startEdit(prompt)}
                      className="mt-2 text-xs text-primary-600 font-semibold hover:text-primary-700"
                    >
                      แก้ไข
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Prompt */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        {showNew ? (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900">เพิ่ม Prompt ใหม่</h2>
            <select
              value={newPrompt.prompt_type}
              onChange={(e) => setNewPrompt({ ...newPrompt, prompt_type: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            >
              <option value="system">System</option>
              <option value="category">Category</option>
              <option value="product_specific">Product Specific</option>
            </select>
            <textarea
              value={newPrompt.prompt_text}
              onChange={(e) => setNewPrompt({ ...newPrompt, prompt_text: e.target.value })}
              rows={4}
              placeholder="ข้อความ prompt..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <div className="flex gap-2">
              <button
                onClick={createPrompt}
                disabled={saving === -1}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
              >
                {saving === -1 ? "กำลังสร้าง..." : "สร้าง"}
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 text-sm text-primary-600 font-semibold hover:text-primary-700"
          >
            <Plus className="w-4 h-4" />
            เพิ่ม Prompt ใหม่
          </button>
        )}
      </div>

      {/* Regenerate Embeddings */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Product Embeddings</h2>
        <p className="text-xs text-gray-400 mb-3">
          สร้าง embeddings ใหม่สำหรับการค้นหาสินค้าด้วย AI (ใช้เมื่อเพิ่มหรือแก้ไขสินค้า)
        </p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-4 py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-semibold hover:bg-primary-100 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
          {regenerating ? "กำลังสร้าง..." : "สร้าง Embeddings ใหม่"}
        </button>
        {regenerateResult && (
          <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            {regenerateResult}
          </p>
        )}
      </div>
    </div>
  );
}
