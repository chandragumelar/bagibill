import { lazy, Suspense, type ComponentType } from "react";
import { matchRoute } from "@/routes/router";

const AppRoutes = lazy(() => import("@/routes/AppRoutes").then((mod) => ({ default: mod.AppRoutes })));
const ClaimPage = lazy(() => import("@/routes/claim/ClaimPage"));
const JoinPage = lazy(() => import("@/routes/join/JoinPage"));

// Digate di belakang import.meta.env.DEV (bukan cuma "nol pernah ditautkan")
// supaya Rollup beneran mendrop kedua chunk ini dari build produksi — bukan
// cuma nol dimuat saat runtime. import.meta.env.DEV diganti Vite jadi literal
// `false` waktu build produksi, jadi cabang ini (termasuk import()-nya)
// provably unreachable dan ke-DCE total (F4-02, K-147: /dev/ui ditinjau,
// digating sama seperti /dev/data — alasannya sama, alat internal nol
// tautan, bukan fitur pengguna). `pnpm dev` selalu jalan di mode dev jadi
// dua halaman ini tetap bisa dibuka lokal.
const DevUiPage = import.meta.env.DEV
  ? lazy(() => import("@/routes/dev/ui").then((mod) => ({ default: mod.DevUiPage })))
  : undefined;
const DevDataPage = import.meta.env.DEV
  ? lazy(() => import("@/routes/dev/data").then((mod) => ({ default: mod.DevDataPage })))
  : undefined;

// Cabang di sini, sebelum apapun di-import, biar /c/ dan /j/ nggak pernah
// narik chunk AppRoutes (yang isinya seluruh rute dalam-app). Dihitung
// sekali waktu mount — pindah antar /c/, /j/, /dev/ui, dan app selalu
// lewat link baru (QR/share/ketik URL), bukan navigasi client-side dalam
// satu sesi.
export function resolveBranch(pathname: string): ComponentType {
  if (matchRoute(pathname, "/c/:slug/:expenseId")) return ClaimPage;
  if (matchRoute(pathname, "/j/:slug")) return JoinPage;
  if (pathname === "/dev/ui" && DevUiPage !== undefined) return DevUiPage;
  if (pathname === "/dev/data" && DevDataPage !== undefined) return DevDataPage;
  return AppRoutes;
}

// Tag JSX di bawah harus tetap identifier statis (ClaimPage, bukan variabel
// yang isinya dipilih saat render) biar react-hooks/static-components diam
// — komponen lazy tidak boleh "dibuat" waktu render, cuma dipilih.
export function App() {
  const branch = resolveBranch(window.location.pathname);
  if (branch === ClaimPage) {
    return (
      <Suspense fallback={null}>
        <ClaimPage />
      </Suspense>
    );
  }
  if (branch === JoinPage) {
    return (
      <Suspense fallback={null}>
        <JoinPage />
      </Suspense>
    );
  }
  if (DevUiPage !== undefined && branch === DevUiPage) {
    return (
      <Suspense fallback={null}>
        <DevUiPage />
      </Suspense>
    );
  }
  if (DevDataPage !== undefined && branch === DevDataPage) {
    return (
      <Suspense fallback={null}>
        <DevDataPage />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={null}>
      <AppRoutes />
    </Suspense>
  );
}
