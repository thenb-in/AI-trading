import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import PropTypes from "prop-types";
import { ConfirmModal } from "@startup/components/base_components/master";
import { useDataContext } from "@context/useDataContext";
import { SetupTotpPopup } from "./auth/SetupTotpPopup";

/**
 * Sets up Google Authenticator again for the signed-in user
 */
function AuthenticatorButton({ collapsed }) {
  const { userData } = useDataContext();
  const [step, setStep] = useState("closed"); // closed | confirm | setup

  if (!userData || userData.isSso) {
    return null;
  }

  const close = () => setStep("closed");
  const startSetup = () => setStep("setup");

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("confirm")}
        title="Set up Google Authenticator again"
        className={`w-full flex items-center rounded-lg hover:bg-gray-700 text-gray-300 transition-colors font-medium ${collapsed ? "p-2 justify-center" : "py-3 justify-start"}`}
      >
        <ShieldCheck className="w-5 h-5 flex-shrink-0" size={20} />
        {!collapsed && <span className="ml-2">Authenticator</span>}
      </button>

      <ConfirmModal
        isOpen={step === "confirm"}
        onClose={close}
        onConfirm={startSetup}
        title="Set up Google Authenticator again"
        message="Lost your phone or had it stolen? Don't worry — you can set up Google Authenticator again here. Codes from your old device will stop working."
        confirmText="Continue"
      />

      {step === "setup" && (
        <SetupTotpPopup
          isOpen
          replace
          onClose={close}
          onSuccess={close}
        />
      )}
    </>
  );
}

AuthenticatorButton.propTypes = {
  collapsed: PropTypes.bool.isRequired,
};

export { AuthenticatorButton };
