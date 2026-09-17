import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import "@/styles/global.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("main: #root element missing from index.html");
}

void import("@/lib/storage/repositories")
  .then(({ purgeExpiredDeletedRecords }) => purgeExpiredDeletedRecords())
  .catch((error: unknown) => {
    console.error("storage cleanup failed", error);
  });

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
