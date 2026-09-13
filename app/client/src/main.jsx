import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { DataProvider } from "@startup/context/AuthContext";
import { MasterModalProvider } from "@startup/components/base_components/index";
import { registerServiceWorker } from "@startup/seo/registerServiceWorker";
import { registerAppData } from "./data/registerAppData";
import "./index.css";

// Plug this app's masters, modules, reports, and filter resolvers into the
// startup library's registries
registerAppData();

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
          {/* Renders whichever "create a master" modal an app registered with
              masterCreatorRegistry. This template registers none, so it costs
              a context and nothing else until an app built from it does. */}
          <MasterModalProvider>
            <App />
          </MasterModalProvider>
        </DataProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
