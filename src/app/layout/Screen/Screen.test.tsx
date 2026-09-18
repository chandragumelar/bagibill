import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen as rtlScreen } from "@testing-library/react";
import { Screen } from "@/app/layout/Screen/Screen";

const screenStyles = readFileSync(resolve(process.cwd(), "src/app/layout/Screen/Screen.module.css"), "utf8");
const bottomBarStyles = readFileSync(resolve(process.cwd(), "src/app/layout/BottomBar/BottomBar.module.css"), "utf8");
const globalStyles = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8");
const documentMarkup = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("Screen", () => {
  it("renders header, body, and bottomBar", () => {
    render(
      <Screen header={<div>header</div>} bottomBar={<div>bottom</div>}>
        <div>body</div>
      </Screen>,
    );
    expect(rtlScreen.getByText("header")).toBeInTheDocument();
    expect(rtlScreen.getByText("body")).toBeInTheDocument();
    expect(rtlScreen.getByText("bottom")).toBeInTheDocument();
  });

  it("renders without bottomBar when not given", () => {
    render(
      <Screen header={<div>header</div>}>
        <div>body</div>
      </Screen>,
    );
    expect(rtlScreen.queryByText("bottom")).not.toBeInTheDocument();
  });

  it("keeps header and bottomBar outside the only scroll container", () => {
    const { container } = render(
      <Screen header={<div>header</div>} bottomBar={<div>bottom</div>}>
        <div>body</div>
      </Screen>,
    );
    const shell = container.firstElementChild;
    expect(shell?.children).toHaveLength(3);
    expect(shell?.children[0]).toHaveTextContent("header");
    expect(shell?.children[1]).toHaveTextContent("body");
    expect(shell?.children[2]).toHaveTextContent("bottom");
    expect(screenStyles).toMatch(/\.screen\s*\{[\s\S]*height:\s*100vh;[\s\S]*height:\s*100dvh;[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*hidden;/);
    expect(screenStyles).toMatch(/\.body\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto;/);
  });

  it("accounts for safe-area inset and gives root a bounded fallback height", () => {
    expect(bottomBarStyles).toContain("env(safe-area-inset-bottom)");
    expect(globalStyles).toMatch(/html,[\s\S]*body,[\s\S]*#root\s*\{[\s\S]*height:\s*100%;/);
    expect(documentMarkup).toContain("viewport-fit=cover");
  });
});
