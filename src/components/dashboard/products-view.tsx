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
  Layers,
  Filter,
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
      {/* Top 4 Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Produk Aktif */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Produk Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {activeCount}
            </span>
            <span className="text-xs text-zinc-400">dari {products.length} SKU</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Siap dicatat di Telegram
          </div>
        </div>

        {/* Metric 2: Produk Default */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Produk Default
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white truncate" title={defaultProduct?.name || "Belum diatur"}>
            {defaultProduct ? defaultProduct.name : "Belum Diatur"}
          </div>
          <div className="mt-2 text-[11px] text-amber-400/90 font-mono">
            {defaultProduct ? `Rp${new Intl.NumberFormat("id-ID").format(defaultProduct.default_price)} / ${defaultProduct.unit}` : "Klik 'Set Default'"}
          </div>
        </div>

        {/* Metric 3: Alias Terdaftar */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Alias Bot Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {totalAliases}
            </span>
            <span className="text-xs text-zinc-400">Kata Kunci</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-400/90 font-medium">
            Sinonim parser natural
          </div>
        </div>

        {/* Metric 4: Total Katalog */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Total Katalog
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {products.length}
            </span>
            <span className="text-xs text-zinc-400">Komoditas</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 font-medium">
            Multi-produk per tenant
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111726]/60 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari komoditas atau alias bot..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            >
              <option value="all" className="bg-[#111726] text-white">Semua Status</option>
              <option value="active" className="bg-[#111726] text-white">Hanya Aktif</option>
              <option value="inactive" className="bg-[#111726] text-white">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Add Product Button */}
        {canManage && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-900/30 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        )}
      </div>

      {/* Products Table & Mobile Cards */}
      {filteredProducts.length === 0 ? (
        <div className="py-14 px-4 text-center rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {products.length === 0 ? "Belum ada produk" : "Produk tidak ditemukan"}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {products.length === 0
              ? "Tambahkan produk pertama usaha Anda agar bot dapat mengenali pencatatan transaksi via Telegram secara otomatis."
              : `Tidak ada produk yang cocok dengan pencarian "${searchQuery}". Coba kata kunci lain.`}
          </p>
          {canManage && products.length === 0 && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md shadow-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 uppercase font-semibold tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Nama Produk</th>
                  <th className="py-3.5 px-4">Satuan</th>
                  <th className="py-3.5 px-4">Harga Satuan (IDR)</th>
                  <th className="py-3.5 px-4">Kata Kunci & Alias Bot</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Default Master</th>
                  {canManage && <th className="py-3.5 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{p.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">ID: {p.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[11px]">
                        {p.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      Rp{new Intl.NumberFormat("id-ID").format(p.default_price)}
                    </td>
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Canonical name badge */}
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30"
                          title="Nama resmi komoditas"
                        >
                          {p.name}
                        </span>
                        {/* Additional aliases badges */}
                        {(p.aliases || []).map((al) => (
                          <span
                            key={al.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                          >
                            {al.alias}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAlias(al.id)}
                                className="hover:text-red-400 transition-colors ml-0.5"
                                title="Hapus alias"
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
                            className="inline-flex items-center gap-0.5 text-[11px] text-purple-400 hover:text-purple-300 hover:underline font-medium ml-1"
                            title="Tambah alias baru"
                          >
                            <Plus className="w-3 h-3" /> Alias
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {p.active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <Check className="w-3 h-3 text-emerald-400" />
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {p.is_default ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          DEFAULT
                        </span>
                      ) : (
                        canManage && (
                          <button
                            onClick={() => handleSetDefault(p.id)}
                            disabled={loading || !p.active}
                            className="text-[11px] text-zinc-400 hover:text-amber-300 hover:underline disabled:opacity-40 transition-colors"
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 font-medium text-[11px] transition-colors"
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

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-[#111726]/90 p-4 space-y-3 backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{p.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Rp{new Intl.NumberFormat("id-ID").format(p.default_price)} / {p.unit}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.is_default && (
                      <span className="p-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300" title="Default Produk">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </span>
                    )}
                    {p.active ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                        Nonaktif
                      </span>
                    )}
                  </div>
                </div>

                {/* Aliases */}
                <div className="pt-1">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-1.5">
                    Kata Kunci Bot
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {p.name}
                    </span>
                    {(p.aliases || []).map((al) => (
                      <span
                        key={al.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                      >
                        {al.alias}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAlias(al.id)}
                            className="text-cyan-400 hover:text-red-400"
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
                        className="inline-flex items-center gap-0.5 text-[11px] text-purple-400 font-medium ml-1"
                      >
                        <Plus className="w-3 h-3" /> Alias
                      </button>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {canManage && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      {!p.is_default && p.active && (
                        <button
                          onClick={() => handleSetDefault(p.id)}
                          disabled={loading}
                          className="text-xs text-amber-400 hover:underline font-medium"
                        >
                          Jadikan Default
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-200 text-xs font-medium"
                    >
                      <Edit2 className="w-3 h-3 text-zinc-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111726] rounded-2xl border border-white/10 shadow-2xl max-w-md w-full overflow-hidden text-white animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Tambah Produk Baru
                </h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nama Produk
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Contoh: Lele, Nila, Gurame"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Satuan Takaran
                </label>
                <input
                  name="unit"
                  type="text"
                  required
                  defaultValue="kg"
                  placeholder="kg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Harga Satuan (IDR)
                </label>
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="1"
                  placeholder="Contoh: 28000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-purple-900/30 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111726] rounded-2xl border border-white/10 shadow-2xl max-w-md w-full overflow-hidden text-white animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Edit Produk: {editingProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nama Produk
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingProduct.name}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Satuan Takaran
                </label>
                <input
                  name="unit"
                  type="text"
                  required
                  defaultValue={editingProduct.unit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Harga Satuan (IDR)
                </label>
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="1"
                  defaultValue={editingProduct.default_price}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  defaultChecked={editingProduct.active}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                />
                <label htmlFor="active" className="text-xs font-medium text-zinc-300 cursor-pointer">
                  Produk Aktif untuk Pencatatan Transaksi
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-purple-900/30 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111726] rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full overflow-hidden text-white animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  Tambah Alias Bot
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Untuk produk: <span className="font-semibold text-purple-300">{aliasModalProduct.name}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setAliasModalProduct(null);
                  setNewAliasText("");
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAliasSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nama Alias / Sinonim
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newAliasText}
                  onChange={(e) => setNewAliasText(e.target.value)}
                  placeholder="Contoh: ikan nila, tilapia"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-purple-900/30 transition"
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
