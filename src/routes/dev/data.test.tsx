import "fake-indexeddb/auto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { DevDataPage } from "./data";

beforeAll(async () => {
  await db.open();
});

let createObjectURLMock: ReturnType<typeof vi.fn<(obj: Blob | MediaSource) => string>>;
let revokeObjectURLMock: ReturnType<typeof vi.fn<(url: string) => void>>;

beforeEach(() => {
  createObjectURLMock = vi.fn(() => "blob:mock-url");
  revokeObjectURLMock = vi.fn();
  URL.createObjectURL = createObjectURLMock;
  URL.revokeObjectURL = revokeObjectURLMock;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([
    db.groups.clear(),
    db.members.clear(),
    db.expenses.clear(),
    db.settlements.clear(),
    db.activityLog.clear(),
  ]);
});

describe("DevDataPage", () => {
  it("renders without throwing", () => {
    render(<DevDataPage />);
    expect(screen.getByText("Export data")).toBeInTheDocument();
  });

  it("exports data and shows a row-count summary when the button is pressed", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.groups.put({
      slug: "g1",
      name: "Trip",
      baseCurrency: "IDR",
      template: "trip",
      createdAt: 1_000,
      settings: { simplifyDebts: true, locked: false, archived: false },
      seq: 0,
    });

    render(<DevDataPage />);
    fireEvent.click(screen.getByText("Export data"));

    await waitFor(() => {
      expect(screen.getByText(/groups: 1/)).toBeInTheDocument();
    });
    expect(screen.getByText(/members: 0/)).toBeInTheDocument();
  });

  it("calls createObjectURL and revokeObjectURL in a pair when downloading", async () => {
    render(<DevDataPage />);
    fireEvent.click(screen.getByText("Export data"));

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    });
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
  });
});
