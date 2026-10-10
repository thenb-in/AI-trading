// Routes that render inside the AdminLayout / sidebar. Registered into the
// framework router by registerAppData(). Paths are relative to /admin, so
// `market-dashboard` renders at /admin/market-dashboard and its nav module's
// navigatePath must be /admin/market-dashboard.
import MarketDashboard from "@app/pages/MarketDashboard.jsx";
import SystemLogic from "@app/pages/SystemLogic.jsx";
import Method2Dashboard from "@app/pages/Method2Dashboard.jsx";
import Method2Brief from "@app/pages/Method2Brief.jsx";
import YearBacktest from "@app/pages/YearBacktest.jsx";
import ScalpDashboard from "@app/pages/ScalpDashboard.jsx";
import OptionChain from "@app/pages/OptionChain.jsx";
import YtBacktest from "@app/pages/YtBacktest.jsx";
import Seasonality from "@app/pages/Seasonality.jsx";
import LiveTrading from "@app/pages/LiveTrading.jsx";
import TradeDesk from "@app/pages/TradeDesk.jsx";

const appRoutes = [
  { path: "market-dashboard", element: <MarketDashboard /> },
  { path: "method2", element: <Method2Dashboard /> },
  { path: "brief", element: <Method2Brief /> },
  { path: "backtest", element: <YearBacktest /> }, // reads ?m=m2p|m3
  { path: "scalp", element: <ScalpDashboard /> },
  { path: "option-chain", element: <OptionChain /> },
  { path: "yt-backtest", element: <YtBacktest /> },
  { path: "seasonality", element: <Seasonality /> },
  { path: "live-trading", element: <LiveTrading /> },
  { path: "trade-desk", element: <TradeDesk /> },
  { path: "system-logic", element: <SystemLogic /> },
];

// Routes that should NOT use the AdminLayout / sidebar — standalone screens.
const appRoutesWithoutSidebar = [];

// Static report pages that render at fixed slugs under /admin/report.
const reportStaticPages = [];

export { appRoutes, appRoutesWithoutSidebar, reportStaticPages };
