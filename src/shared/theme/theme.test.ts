import { afterEach, describe, expect, it } from "vitest";
import {
  applyStoredTheme,
  getStoredThemeOverride,
  setThemeOverride,
  THEME_STORAGE_KEY,
} from "@/shared/theme/theme";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("getStoredThemeOverride", () => {
  it("returns null kalau belum ada override tersimpan", () => {
    expect(getStoredThemeOverride()).toBeNull();
  });

  it("mengabaikan nilai korup di localStorage", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(getStoredThemeOverride()).toBeNull();
  });
});

describe("setThemeOverride", () => {
  it("menyimpan dan memasang data-theme dark", () => {
    setThemeOverride("dark");
    expect(getStoredThemeOverride()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("menyimpan dan memasang data-theme light", () => {
    setThemeOverride("light");
    expect(getStoredThemeOverride()).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("null menghapus override dan atribut, balik ikut sistem", () => {
    setThemeOverride("dark");
    setThemeOverride(null);
    expect(getStoredThemeOverride()).toBeNull();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});

describe("applyStoredTheme", () => {
  it("memasang atribut kalau ada override tersimpan", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    applyStoredTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("tidak menyentuh atribut kalau belum ada override", () => {
    applyStoredTheme();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
