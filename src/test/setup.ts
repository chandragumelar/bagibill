import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.ts pakai globals:false, jadi auto-cleanup bawaan Testing
// Library (yang mendeteksi afterEach global) tidak pernah nyala — tanpa ini,
// render() dari test sebelumnya menumpuk di document.body dan bikin query
// "Found multiple elements" palsu di file test manapun yang punya >1 test.
afterEach(() => {
  cleanup();
});
