"use client";

import { useState } from "react";
import { PlatformUserItem, PlatformAdminRole } from "@/modules/subscriptions/types";
import {
  adminUpdatePlatformRoleAction,
  adminDeactivatePlatformAdminAction,
  adminReactivatePlatformAdminAction,
} from "@/app/admin/actions";
import { ShieldCheck, Search, AlertTriangle } from "lucide-react";

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
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedback.success
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari user ID, email, atau bisnis..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === "all" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Semua ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter("admin")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === "admin" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Platform Admin ({users.filter((u) => u.platformRole !== null).length})
          </button>
          <button
            onClick={() => setRoleFilter("merchant")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === "merchant" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Merchant Only ({users.filter((u) => u.platformRole === null).length})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 font-medium">
              <tr>
                <th className="py-3 px-4">Pengguna & Akun Auth</th>
                <th className="py-3 px-4">Peran Bisnis (Tenant)</th>
                <th className="py-3 px-4">Peran Platform (Admin)</th>
                <th className="py-3 px-4">Status Admin</th>
                <th className="py-3 px-4 text-right">Aksi Platform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">
                    Tidak ada pengguna yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.userId === currentUserId;
                  const isPlatformAdmin = u.platformRole !== null;

                  return (
                    <tr key={u.userId} className="hover:bg-zinc-800/30">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                          <span>{u.email}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{u.userId}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.businessName ? (
                          <div>
                            <span className="font-medium text-zinc-200">{u.businessName}</span>
                            <span className="text-[10px] text-zinc-500 block capitalize">
                              Role: {u.businessRole || "member"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isPlatformAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <ShieldCheck className="w-3 h-3" />
                            {u.platformRole}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Bukan Admin</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isPlatformAdmin ? (
                          u.platformAdminActive ? (
                            <span className="text-[10px] font-bold text-emerald-400">AKTIF</span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-400">NONAKTIF</span>
                          )
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isPlatformAdmin && isSuperAdmin && !isCurrent ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={u.platformRole || "viewer"}
                              disabled={isSubmitting}
                              onChange={(e) => handleRoleChange(u.userId, e.target.value as PlatformAdminRole)}
                              className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-200 focus:outline-none"
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
                                className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold transition-colors"
                              >
                                Nonaktifkan
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(u.userId)}
                                disabled={isSubmitting}
                                className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
                              >
                                Aktifkan
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">-</span>
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

      {/* Confirmation Modal for Deactivation */}
      {deactivateModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-zinc-100">Konfirmasi Nonaktifkan Admin</h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Anda akan menonaktifkan hak akses administratif platform untuk:
            </p>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200">
              {deactivateModalUser.email} ({deactivateModalUser.platformRole})
            </div>

            <p className="text-xs text-zinc-400">
              Ketik <span className="font-bold text-rose-400">NONAKTIF</span> untuk mengonfirmasi:
            </p>

            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="Ketik NONAKTIF"
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-mono focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeactivateModalUser(null);
                  setTypedConfirm("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={typedConfirm !== "NONAKTIF" || isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-semibold text-xs transition-colors"
              >
                {isSubmitting ? "Memproses..." : "Ya, Nonaktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
