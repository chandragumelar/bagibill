import type { AnchorHTMLAttributes, ComponentType, MouseEvent, ReactNode } from "react";
import { createContext, Suspense, useContext, useEffect, useState } from "react";

// Router tipis sendiri (K-21) — nol dependency, cuma match path statis plus
// :param, tanpa nested layout atau data loader. Ganti ke library beneran
// kalau salah satu itu jadi kebutuhan nyata, bukan sebelum itu.

export type RouteParams = Record<string, string>;

export interface RouteDef {
  path: string;
  Component: ComponentType;
}

const ParamsContext = createContext<RouteParams>({});

/** Baca `:param` dari path rute yang aktif. Kosong kalau dipanggil di luar rute. */
export function useRouteParams(): RouteParams {
  return useContext(ParamsContext);
}

const NAVIGATE_EVENT = "bagibill:navigate";

function getPathname(): string {
  return window.location.pathname;
}

/** Pindah halaman tanpa reload penuh, dan tanpa nunggu popstate (yang cuma nembak untuk tombol back/forward). */
export function navigate(path: string): void {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function useLocationPath(): string {
  const [path, setPath] = useState(getPathname);

  useEffect(() => {
    function handleChange(): void {
      setPath(getPathname());
    }
    window.addEventListener("popstate", handleChange);
    window.addEventListener(NAVIGATE_EVENT, handleChange);
    return () => {
      window.removeEventListener("popstate", handleChange);
      window.removeEventListener(NAVIGATE_EVENT, handleChange);
    };
  }, []);

  return path;
}

/** Cocokkan satu path pola (`/g/:slug`) ke pathname aktif. Null kalau tidak cocok. */
export function matchRoute(pathname: string, path: string): RouteParams | null {
  const pathSegments = pathname.split("/").filter(Boolean);
  const routeSegments = path.split("/").filter(Boolean);
  if (pathSegments.length !== routeSegments.length) return null;

  const params: RouteParams = {};
  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i] ?? "";
    const pathSegment = pathSegments[i] ?? "";
    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
    } else if (routeSegment !== pathSegment) {
      return null;
    }
  }
  return params;
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  to: string;
  children: ReactNode;
}

/** Link internal — navigasi client-side, tetap `<a>` beneran buat klik-tengah/buka-tab-baru. */
export function Link({ to, children, ...rest }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

export interface AppRouterProps {
  routes: RouteDef[];
  /** Path tujuan kalau pathname aktif tidak cocok rute manapun. */
  fallbackPath: string;
}

/** Cocokkan pathname ke satu rute, render lazy component-nya. Tidak cocok = redirect ke fallbackPath. */
export function AppRouter({ routes, fallbackPath }: AppRouterProps) {
  const pathname = useLocationPath();
  const matched = routes.map((route) => ({ route, params: matchRoute(pathname, route.path) })).find((entry) => entry.params !== null);

  useEffect(() => {
    if (!matched && pathname !== fallbackPath) {
      navigate(fallbackPath);
    }
  }, [matched, pathname, fallbackPath]);

  if (!matched) return null;

  const { Component } = matched.route;
  return (
    <ParamsContext.Provider value={matched.params ?? {}}>
      <Suspense fallback={null}>
        <Component />
      </Suspense>
    </ParamsContext.Provider>
  );
}
