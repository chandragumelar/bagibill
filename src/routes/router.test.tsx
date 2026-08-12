import { lazy } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppRouter, Link, matchRoute, navigate } from "@/routes/router";

function Home() {
  return <div>Beranda</div>;
}

function GroupDetail() {
  return <div>Detail grup</div>;
}

describe("matchRoute", () => {
  it("returns an empty params object for a static path match", () => {
    expect(matchRoute("/app", "/app")).toEqual({});
  });

  it("returns null when the segment count differs", () => {
    expect(matchRoute("/app/new", "/app")).toBeNull();
  });

  it("extracts a single :param", () => {
    expect(matchRoute("/g/trip-bali", "/g/:slug")).toEqual({ slug: "trip-bali" });
  });

  it("extracts multiple :param segments", () => {
    expect(matchRoute("/c/trip-bali/exp-1", "/c/:slug/:expenseId")).toEqual({
      slug: "trip-bali",
      expenseId: "exp-1",
    });
  });

  it("rejects a static segment that does not match", () => {
    expect(matchRoute("/g/trip-bali/settings", "/g/:slug/members")).toBeNull();
  });

  it("decodes URI-encoded param values", () => {
    expect(matchRoute("/g/trip%20bali", "/g/:slug")).toEqual({ slug: "trip bali" });
  });
});

describe("AppRouter", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/app");
  });

  afterEach(() => {
    window.history.pushState(null, "", "/");
  });

  it("renders the component whose route matches the current path", () => {
    render(
      <AppRouter
        routes={[
          { path: "/app", Component: Home },
          { path: "/g/:slug", Component: GroupDetail },
        ]}
        fallbackPath="/app"
      />,
    );
    expect(screen.getByText("Beranda")).toBeInTheDocument();
  });

  it("navigates client-side and re-renders without a full reload", async () => {
    render(
      <AppRouter
        routes={[
          { path: "/app", Component: Home },
          { path: "/g/:slug", Component: GroupDetail },
        ]}
        fallbackPath="/app"
      />,
    );
    navigate("/g/trip-bali");
    await waitFor(() => {
      expect(screen.getByText("Detail grup")).toBeInTheDocument();
    });
  });

  it("redirects to fallbackPath when nothing matches", async () => {
    window.history.pushState(null, "", "/nowhere");
    render(<AppRouter routes={[{ path: "/app", Component: Home }]} fallbackPath="/app" />);
    await waitFor(() => {
      expect(screen.getByText("Beranda")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/app");
  });

  it("renders a lazily-loaded route component", async () => {
    const LazyHome = lazy(() => Promise.resolve({ default: Home }));
    render(<AppRouter routes={[{ path: "/app", Component: LazyHome }]} fallbackPath="/app" />);
    await waitFor(() => {
      expect(screen.getByText("Beranda")).toBeInTheDocument();
    });
  });
});

describe("Link", () => {
  it("navigates on a plain left click instead of doing a full page load", () => {
    render(
      <AppRouter
        routes={[
          { path: "/app", Component: Home },
          { path: "/g/:slug", Component: GroupDetail },
        ]}
        fallbackPath="/app"
      />,
    );
    render(<Link to="/g/trip-bali">Buka grup</Link>);
    screen.getByText("Buka grup").click();
    expect(window.location.pathname).toBe("/g/trip-bali");
  });
});
