export interface FormControlFontViolation {
  screen: string;
  tagName: string;
  type: string;
  selector: string;
  fontSizePx: number;
}

const TEXT_CONTROL_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"]), textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
const MINIMUM_FONT_SIZE_PX = 16;

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

export function auditFormControlFonts(document: Document, screen: string): FormControlFontViolation[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TEXT_CONTROL_SELECTOR))
    .filter(isVisible)
    .map((element) => ({
      screen,
      tagName: element.tagName.toLowerCase(),
      type: element.getAttribute("type") ?? "",
      selector: element.id ? `#${element.id}` : element.className.toString() || element.tagName.toLowerCase(),
      fontSizePx: Number.parseFloat(window.getComputedStyle(element).fontSize),
    }))
    .filter((violation) => violation.fontSizePx < MINIMUM_FONT_SIZE_PX);
}

export { MINIMUM_FONT_SIZE_PX, TEXT_CONTROL_SELECTOR };

if (import.meta.main) {
  console.error("audit-form-control-fonts: run auditFormControlFonts(document, screen) in browser context");
  process.exitCode = 1;
}
