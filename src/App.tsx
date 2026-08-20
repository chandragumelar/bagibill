import { lazy, Suspense, type ComponentType } from "react";
import { matchRoute } from "@/routes/router";

const AppRoutes = lazy(() => import("@/routes/AppRoutes").then((mod) => ({ default: mod.AppRoutes })));
const ClaimPage = lazy(() => import("@/routes/claim/ClaimPage"));
const JoinPage = lazy(() => import("@/routes/join/JoinPage"));
const DevUiPage = lazy(() => import("@/routes/dev/ui").then((mod) => ({ default: mod.DevUiPage })));
const DevDataPage = lazy(() => import("@/routes/dev/data").then((mod) => ({ default: mod.DevDataPage })));

// Cabang di sini, sebelum apapun di-import, biar /c/ dan /j/ nggak pernah
// narik chunk AppRoutes (yang isinya seluruh rute dalam-app). Dihitung
// sekali waktu mount — pindah antar /c/, /j/, /dev/ui, dan app selalu
// lewat link baru (QR/share/ketik URL), bukan navigasi client-side dalam
// satu sesi.
export function resolveBranch(pathname: string): ComponentType {
  if (matchRoute(pathname, "/c/:slug/:expenseId")) return ClaimPage;
  if (matchRoute(pathname, "/j/:slug")) return JoinPage;
  if (pathname === "/dev/ui") return DevUiPage;
  if (pathname === "/dev/data") return DevDataPage;
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
  if (branch === DevUiPage) {
    return (
      <Suspense fallback={null}>
        <DevUiPage />
      </Suspense>
    );
  }
  if (branch === DevDataPage) {
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
