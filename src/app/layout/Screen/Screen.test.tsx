import { describe, expect, it } from "vitest";
import { render, screen as rtlScreen } from "@testing-library/react";
import { Screen } from "@/app/layout/Screen/Screen";

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
});
