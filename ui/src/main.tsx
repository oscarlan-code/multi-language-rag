import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
// Use dynamic translation system (treats UI as variables, translates on-demand)
import "./i18n-dynamic";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

