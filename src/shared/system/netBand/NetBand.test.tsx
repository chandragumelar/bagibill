import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { t } from "@/lib/i18n";
import { NetBand } from "@/shared/system/netBand/NetBand";

describe("NetBand", () => {
  it("renders the offline message with pending count and recipients", () => {
    render(<NetBand phase="offline" pendingCount={2} recipientsText="Farhan, Sarah & 2 lainnya" />);
    expect(
      screen.getByText(t("system.netband.offline", { count: 2, recipients: "Farhan, Sarah & 2 lainnya" })),
    ).toBeInTheDocument();
    expect(screen.getByText(t("system.netband.offlinePill"))).toBeInTheDocument();
  });

  it("renders the sync message", () => {
    render(<NetBand phase="sync" pendingCount={2} />);
    expect(screen.getByText(t("system.netband.sync", { count: 2 }))).toBeInTheDocument();
  });

  it("renders the done message", () => {
    render(<NetBand phase="done" />);
    expect(screen.getByText(t("system.netband.done"))).toBeInTheDocument();
  });
});
