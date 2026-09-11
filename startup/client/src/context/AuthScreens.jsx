import PropTypes from "prop-types";
import { Loader } from "../components/common/Loader";


function SigningOutOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-slate-900"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs tracking-[0.12em] uppercase text-slate-400 mb-4">NBNext</p>
      <h1 className="text-xl font-semibold text-slate-50 mb-2">Signing you out</h1>
      <p className="text-sm text-slate-300 mb-6 text-center px-6 max-w-sm">
        Please wait while we end your session securely.
      </p>
      <div
        className="h-8 w-8 rounded-full border-[3px] border-slate-600 border-t-slate-50 animate-spin"
        aria-hidden="true"
      />
    </div>
  );
}


function AuthCheckingScreen() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Loader message="Checking your session..." />
    </div>
  );
}


function UnauthorizedScreen({ userData, onLogout, isLoggingOut }) {
  const noneAllowed =
    !userData?.mobileApp && !userData?.desktopWeb && !userData?.mobileWeb;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 space-y-4">
      <div className="p-6 bg-white shadow rounded-xl max-w-md text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Unauthorized Access</h2>
        <p className="text-gray-600">
          You are not authorized to access this app on your current device.
        </p>
        <p className="mt-2 text-gray-500 text-sm">
          Company: <b>{userData?.company?.name || "-"}</b>
        </p>
        <p className="text-gray-500 text-sm">
          Username: <b>{userData?.name || "-"}</b>
        </p>
        <p className="mt-2 text-gray-500 text-sm">
          Allowed devices:{" "}
          <b>
            {userData?.mobileApp ? "Mobile App " : ""}
            {userData?.desktopWeb ? "Desktop Web " : ""}
            {userData?.mobileWeb ? "Mobile Web " : ""}
            {noneAllowed ? "None" : ""}
          </b>
        </p>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="mt-5 w-full inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        )}
      </div>
    </div>
  );
}

UnauthorizedScreen.propTypes = {
  userData: PropTypes.shape({
    name: PropTypes.string,
    company: PropTypes.shape({ name: PropTypes.string }),
    mobileApp: PropTypes.bool,
    desktopWeb: PropTypes.bool,
    mobileWeb: PropTypes.bool,
  }),
  onLogout: PropTypes.func,
  isLoggingOut: PropTypes.bool,
};

export { SigningOutOverlay, AuthCheckingScreen, UnauthorizedScreen };
