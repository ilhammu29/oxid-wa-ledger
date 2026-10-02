"use client";

import { useState } from "react";
import { PlatformUserItem, PlatformAdminRole } from "@/modules/subscriptions/types";
import {
  adminUpdatePlatformRoleAction,
  adminDeactivatePlatformAdminAction,
  adminReactivatePlatformAdminAction,
} from "@/app/admin/actions";
import { Search, AlertTriangle, X, CheckCircle2, Shield } from "lucide-react";

interface AdminUsersClientViewProps {
  users: PlatformUserItem[];
  currentAdminRole: PlatformAdminRole;
  currentUserId: string;
}

export function AdminUsersClientView({
  users,
  currentAdminRole,
  currentUserId,
}: AdminUsersClientViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Modal State for deactivation confirmation
  const [deactivateModalUser, setDeactivateModalUser] = useState<PlatformUserItem | null>(null);
  const [typedConfirm, setTypedConfirm] = useState("");

  const isSuperAdmin = currentAdminRole === "super_admin";

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.businessName && u.businessName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (roleFilter === "all") return matchesSearch;
    if (roleFilter === "admin") return matchesSearch && u.platformRole !== null;
    if (roleFilter === "merchant") return matchesSearch && u.platformRole === null;
    return matchesSearch;
  });

  async function handleRoleChange(userId: string, newRole: PlatformAdminRole) {
    if (!isSuperAdmin) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("targetUserId", userId);
    formData.append("role", newRole);

    const res = await adminUpdatePlatformRoleAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ success: true, message: `Peran platform berhasil diubah menjadi ${newRole}.` });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal mengubah peran platform." });
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivateModalUser || !isSuperAdmin) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("targetUserId", deactivateModalUser.userId);

    const res = await adminDeactivatePlatformAdminAction(formData);
    setIsSubmitting(false);
    setDeactivateModalUser(null);
    setTypedConfirm("");

    if (res.success) {
      setFeedback({ success: true, message: "Akses admin platform berhasil dinonaktifkan." });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal menonaktifkan admin." });
    }
  }

  async function handleReactivate(userId: string) {
    if (!isSuperAdmin) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("targetUserId", userId);

    const res = await adminReactivatePlatformAdminAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ success: true, message: "Akses admin platform berhasil diaktifkan kembali." });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal mengaktifkan kembali admin." });
    }
  }

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. FEEDBACK BANNER
      ────────────────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            feedback.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-muted/30 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER & SEARCH TOOLBAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari user ID, email, atau bisnis..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/80 text-xs">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              roleFilter === "all"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter("admin")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              roleFilter === "admin"
                ? "bg-card text-primary shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Platform Admin ({users.filter((u) => u.platformRole !== null).length})
          </button>
          <button
            onClick={() => setRoleFilter("merchant")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              roleFilter === "merchant"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Merchant Only ({users.filter((u) => u.platformRole === null).length})
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. USERS TABLE FOR DESKTOP (>= 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">Pengguna & Akun Auth</th>
                <th className="py-3 px-4">Peran Bisnis (Tenant)</th>
                <th className="py-3 px-4">Peran Platform (Admin)</th>
                <th className="py-3 px-4">Status Admin</th>
                <th className="py-3 px-4 text-right">Aksi Platform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada pengguna yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.userId === currentUserId;
                  const isPlatformAdmin = u.platformRole !== null;

                  return (
                    <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{u.email}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{u.userId}</div>
                      </td>

                      <td className="py-3 px-4">
                        {u.businessName ? (
                          <div>
                            <span className="font-medium text-foreground">{u.businessName}</span>
                            <span className="text-[10px] text-muted-foreground block capitalize">
                              Role: {u.businessRole || "member"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isPlatformAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 border border-primary/20 text-primary">
                            <Shield className="w-3 h-3" />
                            {u.platformRole}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Bukan Admin</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isPlatformAdmin ? (
                          u.platformAdminActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              AKTIF
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              NONAKTIF
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isPlatformAdmin && isSuperAdmin && !isCurrent ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={u.platformRole || "viewer"}
                              disabled={isSubmitting}
                              onChange={(e) => handleRoleChange(u.userId, e.target.value as PlatformAdminRole)}
                              className="px-2 py-1 rounded-lg bg-background border border-border text-[11px] text-foreground focus:outline-none"
                            >
                              <option value="super_admin">super_admin</option>
                              <option value="support_admin">support_admin</option>
                              <option value="billing_admin">billing_admin</option>
                              <option value="viewer">viewer</option>
                            </select>

                            {u.platformAdminActive ? (
                              <button
                                onClick={() => setDeactivateModalUser(u)}
                                disabled={isSubmitting}
                                className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[11px] font-semibold border border-rose-500/20 transition-colors"
                              >
                                Nonaktifkan
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(u.userId)}
                                disabled={isSubmitting}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[11px] font-semibold border border-emerald-500/20 transition-colors"
                              >
                                Aktifkan
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. RESPONSIVE STRUCTURED CARDS FOR MOBILE (< 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
            Tidak ada pengguna yang cocok dengan filter pencarian.
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isCurrent = u.userId === currentUserId;
            const isPlatformAdmin = u.platformRole !== null;

            return (
              <div
                key={u.userId}
                className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5 truncate">
                      <span className="truncate">{u.email}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{u.userId}</p>
                  </div>
                  {isPlatformAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 border border-primary/20 text-primary shrink-0">
                      {u.platformRole}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                      Merchant
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Bisnis:</span>
                    <span className="font-semibold text-foreground truncate block">
                      {u.businessName || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Role Bisnis:</span>
                    <span className="capitalize text-foreground font-medium">
                      {u.businessRole || "None"}
                    </span>
                  </div>
                  {isPlatformAdmin && (
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Status Admin:</span>
                      {u.platformAdminActive ? (
                        <span className="text-[11px] font-bold text-emerald-500">AKTIF</span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-500">NONAKTIF</span>
                      )}
                    </div>
                  )}
                </div>

                {isPlatformAdmin && isSuperAdmin && !isCurrent && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0">Ubah Peran:</span>
                      <select
                        value={u.platformRole || "viewer"}
                        disabled={isSubmitting}
                        onChange={(e) => handleRoleChange(u.userId, e.target.value as PlatformAdminRole)}
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none"
                      >
                        <option value="super_admin">super_admin</option>
                        <option value="support_admin">support_admin</option>
                        <option value="billing_admin">billing_admin</option>
                        <option value="viewer">viewer</option>
                      </select>
                    </div>

                    {u.platformAdminActive ? (
                      <button
                        onClick={() => setDeactivateModalUser(u)}
                        disabled={isSubmitting}
                        className="w-full py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold border border-rose-500/20 transition-colors"
                      >
                        Nonaktifkan Akses Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(u.userId)}
                        disabled={isSubmitting}
                        className="w-full py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/20 transition-colors"
                      >
                        Aktifkan Kembali Admin
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. DEACTIVATE CONFIRMATION MODAL
      ────────────────────────────────────────────────────────────── */}
      {deactivateModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center gap-2.5 text-rose-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base text-foreground">Nonaktifkan Akses Admin</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda akan menonaktifkan hak akses administratif platform untuk:
            </p>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <p className="font-semibold text-foreground">{deactivateModalUser.email}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{deactivateModalUser.userId}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block">
                Ketik <strong className="text-foreground font-mono">NONAKTIFKAN</strong> untuk konfirmasi:
              </label>
              <input
                type="text"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder="NONAKTIFKAN"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeactivateModalUser(null);
                  setTypedConfirm("");
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={typedConfirm !== "NONAKTIFKAN" || isSubmitting}
                onClick={handleConfirmDeactivate}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-semibold text-xs transition-colors"
              >
                {isSubmitting ? "Memproses..." : "Konfirmasi Nonaktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
