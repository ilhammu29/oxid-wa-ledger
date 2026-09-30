"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { createManualSaleAction } from "@/app/dashboard/actions";

interface ProductOption {
  id: string;
  name: string;
  unit: string;
  default_price: number;
  is_default: boolean;
}

interface CatatPenjualanModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductOption[];
}

export function CatatPenjualanModal({
  isOpen,
  onClose,
  products,
}: CatatPenjualanModalProps) {
  const defaultProd = products.find((p) => p.is_default) || products[0];
  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultProd?.id || ""
  );
  const [quantity, setQuantity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    productName: string;
    quantity: number;
    unit: string;
    totalAmount: number;
  } | null>(null);

  if (!isOpen) return null;

  const currentProduct =
    products.find((p) => p.id === selectedProductId) || defaultProd;

  const numericQty = parseFloat(quantity.replace(",", "."));
  const estimatedTotal =
    !isNaN(numericQty) && numericQty > 0 && currentProduct
      ? Math.round(numericQty * currentProduct.default_price)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessData(null);
    setLoading(true);

    try {
      const formData = new FormData();
      if (selectedProductId) {
        formData.append("productId", selectedProductId);
      }
      formData.append("quantity", quantity);

      const res = await createManualSaleAction(formData);

      if (!res.success) {
        setError(res.error || "Gagal mencatat transaksi.");
        return;
      }

      const d = res.data as {
        productName: string;
        quantity: number;
        unit: string;
        totalAmount: number;
      };

      setSuccessData(d);
      setQuantity("");

      // Auto close after 1.5s
      setTimeout(() => {
        setSuccessData(null);
        onClose();
      }, 1500);
    } catch {
      setError("Terjadi kendala saat mengirim transaksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden text-zinc-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">
              Catat Penjualan Baru
            </h3>
            <p className="text-xs text-zinc-500">
              Input manual transaksi penjualan kasir / dashboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successData && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">
                  Transaksi Berhasil Dicatat!
                </p>
                <p className="text-[11px] mt-0.5">
                  {successData.productName} • {successData.quantity}{" "}
                  {successData.unit} = Rp
                  {new Intl.NumberFormat("id-ID").format(
                    successData.totalAmount
                  )}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                Produk
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit}) — Rp
                    {new Intl.NumberFormat("id-ID").format(p.default_price)}
                    {p.is_default ? " [Default]" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                Jumlah / Kuantitas ({currentProduct?.unit || "kg"})
              </label>
              <input
                type="text"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Contoh: 15 atau 2,5"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Price & Total Preview (Read-only reference) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Harga Resmi Master:</span>
                <span className="font-mono text-zinc-800">
                  Rp
                  {new Intl.NumberFormat("id-ID").format(
                    currentProduct?.default_price || 0
                  )}{" "}
                  / {currentProduct?.unit || "kg"}
                </span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t border-zinc-200 text-zinc-900">
                <span>Estimasi Total:</span>
                <span className="font-mono text-emerald-600 font-bold text-sm">
                  {estimatedTotal !== null
                    ? `Rp${new Intl.NumberFormat("id-ID").format(
                        estimatedTotal
                      )}`
                    : "-"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !quantity}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {loading ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
