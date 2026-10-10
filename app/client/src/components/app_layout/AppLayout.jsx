import { useEffect } from "react";
import { Clock } from "@app/components/Clock.jsx";
import { TradePill } from "@app/components/TradePill.jsx";
import { TradeEffects } from "@app/components/TradeEffects.jsx";
import { startGlossary } from "@app/utils/glossary";
import "@app/styles/theme.css";
import "@app/styles/glossary.css";

// App chrome rendered OUTSIDE the admin sidebar (a sibling of the sidebar via
// AdminLayout). The legacy app mounted these three widgets app-wide and ran the
// glossary tooltip pass on mount; they live here so they stay global under the
// framework shell.
const AppLayout = () => {
  useEffect(() => {
    startGlossary();
  }, []);

  return (
    <>
      <Clock />
      <TradePill />
      <TradeEffects />
    </>
  );
};

export { AppLayout };
