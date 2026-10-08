"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      router.refresh();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-hover/40">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Catat Penjualan Baru
            </h3>
            <p className="text-xs text-muted">
              Input manual transaksi penjualan kasir / dashboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successData && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">
                  Transaksi Berhasil Dicatat!
                </p>
                <p className="text-[11px] mt-0.5 text-muted">
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
              <label className="block text-xs font-medium text-muted mb-1.5">
                Produk
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-foreground">
                    {p.name} ({p.unit}) — Rp
                    {new Intl.NumberFormat("id-ID").format(p.default_price)}
                    {p.is_default ? " [Default]" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Jumlah / Kuantitas ({currentProduct?.unit || "kg"})
              </label>
              <input
                type="text"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Contoh: 15 atau 2,5"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-foreground font-mono placeholder:font-sans placeholder-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Price & Total Preview (Read-only reference) */}
            <div className="bg-surface-hover/50 border border-border rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted">
                <span>Harga Resmi Master:</span>
                <span className="font-mono text-foreground">
                  Rp
                  {new Intl.NumberFormat("id-ID").format(
                    currentProduct?.default_price || 0
                  )}{" "}
                  / {currentProduct?.unit || "kg"}
                </span>
              </div>
              <div className="flex justify-between font-semibold pt-1.5 border-t border-border text-foreground">
                <span>Estimasi Total:</span>
                <span className="font-mono text-primary font-bold text-sm">
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
                className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !quantity}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
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
