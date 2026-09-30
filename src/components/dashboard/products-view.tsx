"use client";

import { useState } from "react";
import {
  Package,
  Plus,
  Check,
  Star,
  Edit2,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  addProductAction,
  updateProductAction,
  setDefaultProductAction,
} from "@/app/dashboard/actions";

export interface ProductRecord {
  id: string;
  name: string;
  unit: string;
  default_price: number;
  active: boolean;
  is_default: boolean;
  created_at: string;
}

interface ProductsViewProps {
  products: ProductRecord[];
  canManage: boolean;
}

export function ProductsView({ products, canManage }: ProductsViewProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await addProductAction(formData);
    setLoading(false);

    if (!res.success) {
      showNotification(res.error || "Gagal menambah produk.", true);
    } else {
      showNotification("Produk baru berhasil ditambahkan!");
      setAddModalOpen(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;

    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await updateProductAction(editingProduct.id, formData);
    setLoading(false);

    if (!res.success) {
      showNotification(res.error || "Gagal memperbarui produk.", true);
    } else {
      showNotification("Data produk berhasil diperbarui!");
      setEditingProduct(null);
    }
  };

  const handleSetDefault = async (productId: string) => {
    setLoading(true);
    const res = await setDefaultProductAction(productId);
    setLoading(false);

    if (!res.success) {
      showNotification(res.error || "Gagal mengatur produk default.", true);
    } else {
      showNotification("Produk default berhasil diperbarui!");
    }
  };

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            Total {products.length} produk terdaftar dalam katalog bisnis.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 uppercase font-semibold tracking-wider text-[11px]">
              <th className="py-3 px-4">Nama Produk</th>
              <th className="py-3 px-4">Satuan</th>
              <th className="py-3 px-4">Harga Satuan (IDR)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Default Master</th>
              {canManage && <th className="py-3 px-4 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-zinc-900 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-zinc-400" />
                    <span>{p.name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-zinc-600 whitespace-nowrap">
                  {p.unit}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                  Rp{new Intl.NumberFormat("id-ID").format(p.default_price)}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {p.active ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Aktif
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                      Nonaktif
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {p.is_default ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      DEFAULT
                    </span>
                  ) : (
                    canManage && (
                      <button
                        onClick={() => handleSetDefault(p.id)}
                        disabled={loading || !p.active}
                        className="text-[11px] text-zinc-500 hover:text-amber-700 hover:underline disabled:opacity-40 transition-colors"
                      >
                        Set Default
                      </button>
                    )
                  )}
                </td>
                {canManage && (
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-[11px] shadow-2xs transition-colors"
                    >
                      <Edit2 className="w-3 h-3 text-zinc-400" />
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden text-zinc-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
              <h3 className="text-base font-bold text-zinc-900">
                Tambah Produk Baru
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Nama Produk
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Contoh: Lele, Nila, Gurame"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Satuan Takaran
                </label>
                <input
                  name="unit"
                  type="text"
                  required
                  defaultValue="kg"
                  placeholder="kg"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Harga Satuan (IDR)
                </label>
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="100"
                  placeholder="Contoh: 28000"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  name="isDefault"
                  id="addIsDefault"
                  type="checkbox"
                  value="true"
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="addIsDefault" className="text-xs text-zinc-700 select-none">
                  Jadikan produk default transaksi tanpa nama
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden text-zinc-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
              <h3 className="text-base font-bold text-zinc-900">
                Edit Produk: {editingProduct.name}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Nama Produk
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingProduct.name}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Satuan Takaran
                </label>
                <input
                  name="unit"
                  type="text"
                  required
                  defaultValue={editingProduct.unit}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Harga Satuan (IDR)
                </label>
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="100"
                  defaultValue={editingProduct.default_price}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  name="active"
                  id="editActive"
                  type="checkbox"
                  value="true"
                  defaultChecked={editingProduct.active}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="editActive" className="text-xs text-zinc-700 select-none">
                  Produk aktif untuk transaksi
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
