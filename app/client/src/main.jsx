import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { DataProvider } from "@startup/context/AuthContext";
import { registerServiceWorker } from "@startup/seo/registerServiceWorker";
import "./filter/registerFilterOptionResolvers";
import "./data/getMasterModules";
import "./index.css";

// Register the production service worker as a side-effect of boot. No-op
// in dev mode; in production, caches the shell + static assets so launch
// is instant and the app survives offline on already-loaded routes.
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* HelmetProvider wraps the tree so <PageMeta /> can manage per-route
        <head> tags. Without the provider, helmet silently no-ops. */}
    <HelmetProvider>
      <BrowserRouter>
        <DataProvider>
          <App />
        </DataProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
