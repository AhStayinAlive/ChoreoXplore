import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "@xyflow/react/dist/style.css";
import App from "./App.jsx";

const rootEl = document.getElementById("root");
if (!rootEl) console.error("No #root div found in index.html");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
