import { lazy } from "react";
import { AppRouter, type RouteDef } from "@/routes/router";

const routes: RouteDef[] = [
  { path: "/app", Component: lazy(() => import("@/routes/home/Home")) },
  { path: "/app/new", Component: lazy(() => import("@/routes/group/NewGroup")) },
  { path: "/g/:slug", Component: lazy(() => import("@/routes/group/GroupDetail")) },
  { path: "/g/:slug/members", Component: lazy(() => import("@/routes/group/GroupMembers")) },
  { path: "/g/:slug/add", Component: lazy(() => import("@/routes/expense/AddExpense")) },
];

/** Router rute-dalam-app gelombang 1. /c/ dan /j/ tidak lewat sini — lihat App.tsx. */
export function AppRoutes() {
  return <AppRouter routes={routes} fallbackPath="/app" />;
}
