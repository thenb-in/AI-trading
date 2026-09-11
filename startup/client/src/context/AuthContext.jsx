import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiService } from "@services/ApiService";
import { setCacheScope } from "@services/cacheManager";
import { isAllowedDevice } from "../utils/deviceUtils";
import PropTypes from "prop-types";
import { DataContext } from "./DataContext";
import { LogoutButton } from "../components/LogoutButton";

const DataProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState(null);
  const [hamburgerMenu, setHamburgerMenu] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();


  useEffect(() => {
    const publicPaths = ["/", "/signup", "/forgot-password"];
    const isPublicPath = publicPaths.some((path) =>
      location.pathname.startsWith(path)
    );
    const isLoginPage = location.pathname === "/";

    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await ApiService.getUser();
        const user = response?.data ?? null;

        if (user) {
          // check allowed device using new flags
          const allowed = isAllowedDevice({
            mobileApp: user.mobileApp,
            desktopWeb: user.desktopWeb,
            mobileWeb: user.mobileWeb,
          });
          setUnauthorized(!allowed);
          console.log(
            "DataProvider: deviceAccess:",
            { mobileApp: user.mobileApp, desktopWeb: user.desktopWeb, mobileWeb: user.mobileWeb },
            "allowed:",
            allowed
          );
        } else {
          setUnauthorized(true);
        }

        setUserData(user);

        // Redirect from login page if already authenticated
        if (isLoginPage && user) {
          const redirectTo = location.state?.from || (user?.isSupportUser ? "/admin/multi-company-setup" : "/admin");
          navigate(redirectTo, { replace: true });
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setUserData(null);
        setError(err);
        // No session left (e.g. right after logging out of the device-block
        // screen) - that is a login problem, not a device problem, so drop the
        // unauthorized screen and let the login page show.
        setUnauthorized(false);

        // Only redirect to login if not on a public path and not already on the login page
        if (!isPublicPath && !isLoginPage) {
          navigate("/", { state: { from: location }, replace: true });
        }
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };

    // Only fetch user if not on a public path (except login page)
    if (isPublicPath) {
      if (isLoginPage) {
        fetchUser();
      } else {
        // For other public paths like /signup, don't check auth
        setLoading(false);
        setAuthChecked(true);
      }
    } else {
      // For protected paths, always check auth
      fetchUser();
    }
  }, [location, navigate]);
  // Cached data (rosters, filter option lists) belongs to one user in one
  // company. Logging out or switching company drops the whole cache; a plain
  // page reload does not, which is what keeps sessionStorage worth having.
  useEffect(() => {
    setCacheScope(userData ? `${userData.id}:${userData.companyId ?? ""}` : null);
  }, [userData]);

  const logout = useCallback(async () => {
    try {
      await ApiService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUserData(null);
      setUnauthorized(false);
      navigate("/");
    }
  }, [navigate]);

  const value = useMemo(
    () => ({
      userData,
      setUserData,
      loading,
      error,
      hamburgerMenu,
      setHamburgerMenu,
      logout,
    }),
    [userData, loading, error, hamburgerMenu, logout]
  );

  // Show loading state while checking authentication
  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        <p className="text-gray-600">Checking authentication status...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 space-y-4">
        <div className="p-6 bg-white shadow rounded-xl max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">You are not authorized to access this app on your current device.</p>
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
              {!userData?.mobileApp && !userData?.desktopWeb && !userData?.mobileWeb
                ? "None"
                : ""}
            </b>
          </p>
          {/* The session is still alive on this blocked device, so give the
              user the only useful action left - log out and sign in as
              someone else (or from an allowed device). */}
          <div className="mt-4">
            <LogoutButton collapsed={false} />
          </div>
        </div>
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { DataProvider };
