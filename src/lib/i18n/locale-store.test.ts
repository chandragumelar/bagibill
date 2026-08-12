import { afterEach, describe, expect, it, vi } from "vitest";
import { detectDefaultLocale, getLocale, setLocale, subscribeLocale } from "@/lib/i18n/locale-store";

afterEach(() => {
  localStorage.clear();
});

describe("detectDefaultLocale", () => {
  it("id kalau navigator.language berawalan id", () => {
    vi.stubGlobal("navigator", { language: "id-ID" });
    expect(detectDefaultLocale()).toBe("id");
    vi.unstubAllGlobals();
  });

  it("en kalau navigator.language bukan id", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detectDefaultLocale()).toBe("en");
    vi.unstubAllGlobals();
  });
});

describe("setLocale / getLocale / subscribeLocale", () => {
  it("ganti locale dan simpan ke localStorage", () => {
    setLocale("en");
    expect(getLocale()).toBe("en");
    expect(localStorage.getItem("bagibill:locale")).toBe("en");
    setLocale("id");
    expect(getLocale()).toBe("id");
  });

  it("memberitahu subscriber waktu locale ganti", () => {
    setLocale("id");
    const listener = vi.fn();
    const unsubscribe = subscribeLocale(listener);
    setLocale("en");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setLocale("id");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tidak memberitahu subscriber kalau locale-nya sama", () => {
    setLocale("id");
    const listener = vi.fn();
    subscribeLocale(listener);
    setLocale("id");
    expect(listener).not.toHaveBeenCalled();
  });
});
