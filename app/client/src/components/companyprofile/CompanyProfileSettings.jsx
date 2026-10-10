import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { KeyRound, LineChart, Clock, Gauge, Sliders, Scale } from "lucide-react";

import { SettingsCard } from "@startup/components/admin/company_setting/SettingsCard";
import { TextTypeField } from "@startup/components/base_components/fields/TextTypeField";
import { NumberTypeField } from "@startup/components/base_components/fields/NumberTypeField";
import { TimeTypeField } from "@startup/components/base_components/fields/TimeTypeField";
import { CheckboxTypeField } from "@startup/components/base_components/fields/CheckboxTypeField";
import { SearchableDropdown } from "@startup/components/base_components/fields/SearchableDropdown";
import { getApiErrorMessage } from "@utils/apiErrorMessage";
import { companyProfileTradingService } from "../../services/companyProfileTradingService";

// Field descriptors drive the render so a new tunable is one line, not new JSX.
const SYMBOL_OPTIONS = [
  { value: "NIFTY", label: "NIFTY" },
  { value: "BANKNIFTY", label: "BANK NIFTY" },
  { value: "SENSEX", label: "SENSEX" },
];
const EXECUTION_MODE_OPTIONS = [
  { value: "off", label: "Off — no orders" },
  { value: "dry", label: "Paper (dry run)" },
  { value: "live", label: "Live" },
];
const SIGNAL_MODE_OPTIONS = [
  { value: "selective", label: "Selective" },
  { value: "medium", label: "Medium" },
];
const SESSION_TOGGLES = [
  { name: "session_block_opening", label: "Block opening 09:15–09:30 (volatility trap)" },
  { name: "session_block_lunch", label: "Block lunch 12:30–13:30 (dead zone)" },
  { name: "session_block_closing", label: "Block closing window (15:15, or 15:00 on expiry)" },
  { name: "session_expiry_day_special", label: "Apply earlier closing block on expiry day" },
];
const TUNABLE_FIELDS = [
  { name: "macd_fast", label: "MACD fast period", mode: "int" },
  { name: "macd_slow", label: "MACD slow period", mode: "int" },
  { name: "macd_signal", label: "MACD signal period", mode: "int" },
  { name: "supertrend_atr_period", label: "SuperTrend ATR period", mode: "int" },
  { name: "supertrend_multiplier", label: "SuperTrend multiplier", mode: "float" },
  { name: "vix_high_threshold", label: "VIX high threshold", mode: "float" },
  { name: "vix_low_threshold", label: "VIX low threshold", mode: "float" },
  { name: "volume_breakout_multiplier", label: "Volume breakout multiplier", mode: "float" },
  { name: "cpr_narrow_threshold_pct", label: "CPR narrow threshold (fraction of price)", mode: "float" },
];
const WEIGHT_FIELDS = [
  { name: "macd_confidence_weight", label: "MACD weight" },
  { name: "vix_confidence_weight", label: "VIX weight" },
  { name: "volume_confidence_weight", label: "Volume weight" },
  { name: "supertrend_confidence_weight", label: "SuperTrend weight" },
  { name: "oi_change_confidence_weight", label: "OI change weight" },
  { name: "oi_sr_confidence_weight", label: "OI S/R weight" },
  { name: "max_pain_confidence_weight", label: "Max pain weight" },
  { name: "pdh_pdl_confidence_weight", label: "PDH/PDL weight" },
  { name: "cpr_confidence_weight", label: "CPR weight" },
];
// Every numeric column lives here so load (-> string) and save (-> Number) stay generic.
const NUMERIC_NAMES = [...TUNABLE_FIELDS, ...WEIGHT_FIELDS].map((f) => f.name);

// Loaded row -> form state. Numeric values become strings for the text-based
// number field; booleans/arrays/strings pass through. The read-only
// credentials-configured flag is held outside the editable form.
const toFormState = (data = {}) => {
  const form = {
    zerodha_user_id: data.zerodha_user_id ?? "",
    zerodha_api_key_label: data.zerodha_api_key_label ?? "",
    trading_symbols: Array.isArray(data.trading_symbols) ? data.trading_symbols : [],
    market_open_time: data.market_open_time ?? "",
    market_close_time: data.market_close_time ?? "",
    execution_mode: data.execution_mode ?? "off",
    signal_trade_mode: data.signal_trade_mode ?? "selective",
    signal_use_pcr_weighting: Boolean(data.signal_use_pcr_weighting),
  };
  SESSION_TOGGLES.forEach(({ name }) => { form[name] = Boolean(data[name]); });
  NUMERIC_NAMES.forEach((name) => {
    form[name] = data[name] === null || data[name] === undefined ? "" : String(data[name]);
  });
  return form;
};

// Form state -> API payload. Numeric strings coerce back to numbers.
const toPayload = (form) => {
  const payload = { ...form };
  NUMERIC_NAMES.forEach((name) => {
    payload[name] = form[name] === "" ? null : Number(form[name]);
  });
  return payload;
};

const CompanyProfileSettings = forwardRef(function CompanyProfileSettings({ isLoading, onDirtyChange }, ref) {
  const [form, setForm] = useState(() => toFormState());
  const [credsConfigured, setCredsConfigured] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [dirty, setDirty] = useState(false);
  const originalRef = useRef(form);

  useEffect(() => {
    companyProfileTradingService
      .getTradingConfig()
      .then((res) => {
        const data = res?.data?.data || {};
        const next = toFormState(data);
        setForm(next);
        originalRef.current = next;
        setCredsConfigured(Boolean(data.zerodha_credentials_configured));
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Failed to load trading config")))
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (dirty) onDirtyChange?.(true);
  }, [dirty, onDirtyChange]);

  const setField = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  }, []);

  const handleReset = useCallback(() => {
    setForm(originalRef.current);
    setDirty(false);
  }, []);

  const handleSave = useCallback(async () => {
    const res = await companyProfileTradingService.updateTradingConfig(toPayload(form));
    const saved = toFormState(res?.data?.data || {});
    setForm(saved);
    originalRef.current = saved;
    setDirty(false);
  }, [form]);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    reset: handleReset,
    isDirty: () => dirty,
  }), [handleSave, handleReset, dirty]);

  if (fetching) {
    return <div className="text-sm text-gray-500">Loading trading config…</div>;
  }

  const onText = (name) => (e) => setField(name, e.target.value);
  const onCheck = (name) => (e) => setField(name, e.target.checked);

  return (
    <div className="space-y-4">
      <SettingsCard icon={KeyRound} title="Broker account" subtitle="Non-secret Zerodha references. The API secret and access token live in server env, never here.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <TextTypeField label="Zerodha user id" value={form.zerodha_user_id} onChange={onText("zerodha_user_id")} placeholder="e.g. AB1234" />
          <TextTypeField label="API key label" value={form.zerodha_api_key_label} onChange={onText("zerodha_api_key_label")} placeholder="Which Kite Connect app" hint="A label, not the API key value." />
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Credentials status</div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${credsConfigured ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${credsConfigured ? "bg-green-500" : "bg-amber-500"}`} />
              {credsConfigured ? "Configured in env" : "Not configured"}
            </span>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard icon={LineChart} title="Trading symbols" subtitle="Index symbols this company trades and monitors.">
        <SearchableDropdown options={SYMBOL_OPTIONS} value={form.trading_symbols} onChange={(value) => setField("trading_symbols", value)} multiple placeholder="Select symbols" />
      </SettingsCard>

      <SettingsCard icon={Clock} title="Market session (IST)" subtitle="Session window and the blocks the engine refuses to trade inside.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TimeTypeField label="Market open" value={form.market_open_time} onChange={onText("market_open_time")} />
          <TimeTypeField label="Market close" value={form.market_close_time} onChange={onText("market_close_time")} />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SESSION_TOGGLES.map(({ name, label }) => (
            <CheckboxTypeField key={name} name={name} label={label} checked={form[name]} onChange={onCheck(name)} />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard icon={Gauge} title="Trade mode" subtitle="Order execution switch and signal selectivity.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Execution mode</div>
            <SearchableDropdown options={EXECUTION_MODE_OPTIONS} value={form.execution_mode} onChange={(value) => setField("execution_mode", value)} searchable={false} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Signal mode</div>
            <SearchableDropdown options={SIGNAL_MODE_OPTIONS} value={form.signal_trade_mode} onChange={(value) => setField("signal_trade_mode", value)} searchable={false} />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard icon={Sliders} title="Strategy tunables" subtitle="Indicator parameters and gates.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TUNABLE_FIELDS.map(({ name, label, mode }) => (
            <NumberTypeField key={name} label={label} numberMode={mode} value={form[name]} onChange={onText(name)} />
          ))}
        </div>
        <div className="mt-4">
          <CheckboxTypeField name="signal_use_pcr_weighting" label="Weight signals by Put/Call ratio (PCR)" checked={form.signal_use_pcr_weighting} onChange={onCheck("signal_use_pcr_weighting")} />
        </div>
      </SettingsCard>

      <SettingsCard icon={Scale} title="Confidence weights" subtitle="Each factor's contribution to the combined signal score.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {WEIGHT_FIELDS.map(({ name, label }) => (
            <NumberTypeField key={name} label={label} numberMode="int" value={form[name]} onChange={onText(name)} disabled={isLoading} />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
});

CompanyProfileSettings.propTypes = {
  isLoading: PropTypes.bool,
  onDirtyChange: PropTypes.func,
};

export { CompanyProfileSettings };
