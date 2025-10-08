import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "@xyflow/react/dist/style.css";
import App from "./App.jsx";
import AppAngles from "./AppAngles";

const rootEl = document.getElementById("root");
if (!rootEl) console.error("No #root div found in index.html");

const isAngles = window.location.pathname.startsWith('/angles');
createRoot(rootEl).render(
  <StrictMode>
    {isAngles ? <AppAngles /> : <App />}
  </StrictMode>
);
