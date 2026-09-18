import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { auditFormControlFonts, MINIMUM_FONT_SIZE_PX } from "./audit-form-control-fonts.ts";

describe("auditFormControlFonts", () => {
  beforeEach(() => {
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const fontSize = (element as HTMLElement).dataset.fontSize ?? "17px";
      const hidden = (element as HTMLElement).dataset.hidden === "true";
      return { display: hidden ? "none" : "block", visibility: "visible", opacity: "1", fontSize } as CSSStyleDeclaration;
    });
  });

  it("reports visible text controls below mobile minimum with screen and selector", () => {
    document.body.innerHTML = `
      <input id="title" data-font-size="15px" />
      <textarea data-font-size="17px"></textarea>
      <select data-font-size="15px"><option>One</option></select>
      <input type="checkbox" data-font-size="13px" />
      <div contenteditable="true" data-font-size="15px"></div>
      <input data-hidden="true" data-font-size="12px" />
    `;

    expect(auditFormControlFonts(document, "Tambah Pengeluaran")).toEqual([
      { screen: "Tambah Pengeluaran", tagName: "input", type: "", selector: "#title", fontSizePx: 15 },
      { screen: "Tambah Pengeluaran", tagName: "select", type: "", selector: "select", fontSizePx: 15 },
      { screen: "Tambah Pengeluaran", tagName: "div", type: "", selector: "div", fontSizePx: 15 },
    ]);
  });

  it("uses 16px as minimum", () => {
    expect(MINIMUM_FONT_SIZE_PX).toBe(16);
  });

  it("keeps shared control styles on body token and global mobile guard", () => {
    const tokenCss = readFileSync(path.resolve(import.meta.dirname, "../packages/tokens/tokens.css"), "utf8");
    const globalCss = readFileSync(path.resolve(import.meta.dirname, "../src/styles/global.css"), "utf8");
    const moneyInputCss = readFileSync(path.resolve(import.meta.dirname, "../src/shared/ui/MoneyInput/MoneyInput.module.css"), "utf8");
    const textInputCss = readFileSync(path.resolve(import.meta.dirname, "../src/shared/ui/TextInput/TextInput.module.css"), "utf8");

    expect(tokenCss).toMatch(/--fs-body:\s*17px/);
    expect(globalCss).toContain('input:not([type="checkbox"])');
    expect(globalCss).toContain("textarea");
    expect(globalCss).toContain("select");
    expect(globalCss).toContain("[contenteditable]");
    expect(globalCss).toContain('[role="textbox"]');
    expect(globalCss).toContain("font-size: var(--fs-body)");
    expect(moneyInputCss).toContain("font-size: var(--fs-body)");
    expect(textInputCss).toContain("font-size: var(--fs-body)");
  });
});
