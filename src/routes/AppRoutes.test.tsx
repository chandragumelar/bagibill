import { afterEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { AppRoutes } from "@/routes/AppRoutes";
import { navigate } from "@/routes/router";

describe("AppRoutes", () => {
  afterEach(() => {
    window.history.pushState(null, "", "/");
  });

  it("renders Home at /app", async () => {
    window.history.pushState(null, "", "/app");
    const { findByRole } = render(<AppRoutes />);
    expect(await findByRole("heading", { name: t("route.title.home") })).toBeInTheDocument();
  });

  it("redirects an unmatched path to /app", async () => {
    window.history.pushState(null, "", "/does-not-exist");
    const { findByRole } = render(<AppRoutes />);
    await findByRole("heading", { name: t("route.title.home") });
    expect(window.location.pathname).toBe("/app");
  });

  it("renders GroupDetail at /g/:slug with the slug in the title", async () => {
    window.history.pushState(null, "", "/g/trip-bali");
    const { findByRole } = render(<AppRoutes />);
    expect(await findByRole("heading", { name: t("group.detail.titleFallback", { slug: "trip-bali" }) })).toBeInTheDocument();
  });

  it("follows client-side navigation between routes", async () => {
    window.history.pushState(null, "", "/app");
    const { findByRole } = render(<AppRoutes />);
    await findByRole("heading", { name: t("route.title.home") });
    navigate("/app/new");
    await waitFor(async () => {
      expect(await findByRole("heading", { name: t("route.title.newGroup") })).toBeInTheDocument();
    });
  });
});
