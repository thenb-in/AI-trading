// View layer for the auto-trade / live-execution endpoints.
//
// The business payload consumed by the live-trading / trade-desk screens is
// preserved verbatim from source and wrapped in the framework { success, data }
// envelope at the response boundary; failures become { success:false, error,
// message } with the exact error status codes carried over from source.
const executionController = require('../controllers/executionController');

async function autotradeStateView(_req, res) {
  try {
    res.json({ success: true, data: await executionController.getAutotradeState() });
  } catch (err) {
    res.status(500).json({ success: false, error: `Autotrade state failed`, message: err.message });
  }
}

async function setModeView(req, res) {
  try {
    res.json({ success: true, data: { mode: await executionController.setMode(req.body?.mode) } });
  } catch (err) {
    res.status(400).json({ success: false, error: `Autotrade mode failed`, message: err.message });
  }
}

// Catch-up entry — fired only by the user's explicit click on /live, when a
// ledger trade never reached the account and the user judges conditions
// favourable. Geometry and cage guards enforced server-side.
async function catchUpView(_req, res) {
  try {
    const trade = await executionController.getActiveTrade();
    if (!trade) {
      res.status(400).json({ success: false, error: `No active trade to catch up` });
      return;
    }
    res.json({ success: true, data: await executionController.catchUpEntry(trade) });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Catch-up refused', message: err.message });
  }
}

// Apply suggested levels to the user's own GTT — fired only by the user's
// explicit click on the /live panel.
async function modifyGttView(req, res) {
  try {
    const { tradingsymbol, sl, target } = req.body ?? {};
    res.json({ success: true, data: await executionController.modifyGtt({ tradingsymbol, sl, target }) });
  } catch (err) {
    res.status(400).json({ success: false, error: 'GTT modify failed', message: err.message });
  }
}

module.exports = {
  autotradeStateView,
  setModeView,
  catchUpView,
  modifyGttView
};
