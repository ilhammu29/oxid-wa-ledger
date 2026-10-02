"use client";

import { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Check,
  Star,
  Edit2,
  X,
  AlertCircle,
  CheckCircle2,
  Tag,
  Search,
} from "lucide-react";
import {
  addProductAction,
  updateProductAction,
  setDefaultProductAction,
  addProductAliasAction,
  deleteProductAliasAction,
} from "@/app/dashboard/actions";

export interface ProductRecord {
  id: string;
  name: string;
  unit: string;
  default_price: number;
  active: boolean;
  is_default: boolean;
  created_at: string;
  aliases?: Array<{
    id: string;
    alias: string;
  }>;
}

interface ProductsViewProps {
  products: ProductRecord[];
  canManage: boolean;
}

export function ProductsView({ products, canManage }: ProductsViewProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [aliasModalProduct, setAliasModalProduct] = useState<ProductRecord | null>(null);
  const [newAliasText, setNewAliasText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
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

  // Metrics computation
  const activeCount = useMemo(() => products.filter((p) => p.active).length, [products]);
  const defaultProduct = useMemo(() => products.find((p) => p.is_default), [products]);
  const totalAliases = useMemo(
    () => products.reduce((acc, p) => acc + (p.aliases?.length || 0), 0),
    [products]
  );

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter === "active" && !p.active) return false;
      if (statusFilter === "inactive" && p.active) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.unit.toLowerCase().includes(q)) return true;
      if (p.aliases?.some((al) => al.alias.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [products, searchQuery, statusFilter]);

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

  const handleAddAliasSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!aliasModalProduct || !newAliasText.trim()) return;

    setLoading(true);
    const res = await addProductAliasAction(aliasModalProduct.id, newAliasText);
    setLoading(false);

    if (!res.success) {
      showNotification(res.error || "Gagal menambah alias produk.", true);
    } else {
      showNotification(`Alias '${newAliasText.trim()}' berhasil ditambahkan!`);
      setNewAliasText("");
      setAliasModalProduct(null);
    }
  };

  const handleDeleteAlias = async (aliasId: string) => {
    if (!confirm("Hapus alias kata kunci ini?")) return;
    setLoading(true);
    const res = await deleteProductAliasAction(aliasId);
    setLoading(false);

    if (!res.success) {
      showNotification(res.error || "Gagal menghapus alias.", true);
    } else {
      showNotification("Alias berhasil dihapus.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with Title, Stats Line, and Add Product CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Katalog Produk
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted mt-1 font-mono">
            <span>{activeCount} produk aktif</span>
            <span>·</span>
            <span>{products.length} total SKU</span>
            <span>·</span>
            <span>{totalAliases} alias bot</span>
            <span>·</span>
            <span>
              Default:{" "}
              <strong className="text-foreground font-semibold">
                {defaultProduct ? defaultProduct.name : "Belum diatur"}
              </strong>
            </span>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-xs transition-colors self-start sm:self-center"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Produk</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface border border-border rounded-xl p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama komoditas atau alias bot..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted/60 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-primary transition"
            >
              <option value="all">Semua Status</option>
              <option value="active">Hanya Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table & Mobile Cards */}
      {filteredProducts.length === 0 ? (
        <div className="py-14 px-4 text-center rounded-xl border border-border bg-surface shadow-xs space-y-2.5">
          <Package className="w-8 h-8 text-muted mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">
            {products.length === 0 ? "Belum ada produk" : "Produk tidak ditemukan"}
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
            {products.length === 0
              ? "Tambahkan produk pertama usaha Anda agar bot dapat mengenali pencatatan transaksi via Telegram secara otomatis."
              : `Tidak ada produk yang cocok dengan pencarian "${searchQuery}". Coba kata kunci lain.`}
          </p>
          {canManage && products.length === 0 && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Produk Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50 text-muted/80 uppercase font-mono font-medium tracking-wider text-[11px]">
                  <th className="py-2.5 px-3.5">Nama Produk</th>
                  <th className="py-2.5 px-3.5">Satuan</th>
                  <th className="py-2.5 px-3.5">Harga Acuan</th>
                  <th className="py-2.5 px-3.5">Kata Kunci & Alias Bot</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Default Master</th>
                  {canManage && <th className="py-2.5 px-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-hover/60 transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{p.name}</span>
                        {p.is_default && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="font-mono text-foreground bg-surface-hover border border-border px-1.5 py-0.5 rounded text-[11px]">
                        {p.unit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono tabular-nums font-bold text-foreground whitespace-nowrap">
                      Rp{new Intl.NumberFormat("id-ID").format(p.default_price)}
                    </td>
                    <td className="py-2.5 px-3.5 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                          title="Nama resmi komoditas"
                        >
                          {p.name}
                        </span>
                        {(p.aliases || []).map((al) => (
                          <span
                            key={al.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-muted border border-border"
                          >
                            {al.alias}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAlias(al.id)}
                                className="text-muted hover:text-rose-500 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </span>
                        ))}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setAliasModalProduct(p)}
                            className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline font-medium ml-1"
                          >
                            <Plus className="w-2.5 h-2.5" /> Alias
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {p.active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-medium text-muted bg-surface-hover px-2 py-0.5 rounded-md border border-border">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {p.is_default ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          Utama
                        </span>
                      ) : (
                        canManage && p.active && (
                          <button
                            onClick={() => handleSetDefault(p.id)}
                            disabled={loading}
                            className="text-[11px] text-muted hover:text-foreground hover:underline transition-colors"
                          >
                            Jadikan Default
                          </button>
                        )
                      )}
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground text-[11px] font-medium transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-muted" />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-2">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary/40 space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-foreground font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-muted font-mono mt-0.5">
                      Rp{new Intl.NumberFormat("id-ID").format(p.default_price)} / {p.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.is_default && (
                      <span className="p-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400" title="Default Produk">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </span>
                    )}
                    {p.active ? (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-muted bg-surface-hover px-2 py-0.5 rounded-md border border-border">
                        Nonaktif
                      </span>
                    )}
                  </div>
                </div>

                {/* Aliases */}
                <div className="pt-1">
                  <div className="text-[10px] uppercase font-semibold text-muted tracking-wider mb-1">
                    Kata Kunci Bot
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                      {p.name}
                    </span>
                    {(p.aliases || []).map((al) => (
                      <span
                        key={al.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-muted border border-border"
                      >
                        {al.alias}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAlias(al.id)}
                            className="text-muted hover:text-rose-500"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setAliasModalProduct(p)}
                        className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline font-medium ml-1"
                      >
                        <Plus className="w-2.5 h-2.5" /> Alias
                      </button>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {canManage && (
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div>
                      {!p.is_default && p.active && (
                        <button
                          onClick={() => handleSetDefault(p.id)}
                          disabled={loading}
                          className="text-xs text-muted hover:text-foreground hover:underline font-medium"
                        >
                          Jadikan Default
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-medium"
                    >
                      <Edit2 className="w-3 h-3 text-muted" />
                      <span>Edit Produk</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Product Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-hover/40">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Tambah Produk Baru
                </h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Nama Produk
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Contoh: Lele, Nila, Gurame"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Satuan Takaran
                </label>
                <input
                  name="unit"
                  type="text"
                  required
                  defaultValue="kg"
                  placeholder="kg"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Harga Satuan (IDR)
                </label>
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="1"
                  placeholder="Contoh: 28000"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 shadow-xs transition"
                >
                  {loading ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-hover/40">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Edit Produk: {editingProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Nama Produk
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingProduct.name}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Satuan Takaran
                </label>
                <input
                  name="unit"
                  type="text"
                  required
                  defaultValue={editingProduct.unit}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Harga Satuan (IDR)
                </label>
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="1"
                  defaultValue={editingProduct.default_price}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  defaultChecked={editingProduct.active}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                />
                <label htmlFor="active" className="text-xs font-medium text-foreground cursor-pointer">
                  Produk Aktif untuk Pencatatan Transaksi
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 shadow-xs transition"
                >
                  {loading ? "Menyimpan..." : "Perbarui Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Alias Modal */}
      {aliasModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-sm w-full overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-hover/40">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Tambah Alias Bot
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Produk: <span className="font-semibold text-foreground">{aliasModalProduct.name}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setAliasModalProduct(null);
                  setNewAliasText("");
                }}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddAliasSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Nama Alias / Sinonim
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newAliasText}
                  onChange={(e) => setNewAliasText(e.target.value)}
                  placeholder="Contoh: ikan nila, tilapia"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                  Bot Telegram akan otomatis mengenali kata kunci ini saat dicatat di pesan.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAliasModalProduct(null);
                    setNewAliasText("");
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 shadow-xs transition"
                >
                  {loading ? "Menyimpan..." : "Simpan Alias"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
