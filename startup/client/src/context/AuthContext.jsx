import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiService } from "@services/ApiService";
import { setCacheScope } from "@services/cacheManager";
import { isAllowedDevice } from "../utils/deviceUtils";
import { isSsoEnabled } from "@startup/sso/ssoMode";
import PropTypes from "prop-types";
import { DataContext } from "./DataContext";
import {
  SigningOutOverlay,
  AuthCheckingScreen,
  UnauthorizedScreen,
} from "./AuthScreens";


const isAnonymousPath = (path, publicPaths = []) =>
  path === "/" ||
  path === "/login" ||
  path === "/signup" ||
  path === "/forgot-password" ||
  path.startsWith("/signup/") ||
  path.startsWith("/forgot-password/") ||
  publicPaths.some((entry) => path === entry || path.startsWith(`${entry.replace(/\/$/, "")}/`));

/**
 * `publicPaths` lets an app declare entry paths of its own that an anonymous
 * visitor may land on — app-owned routes passed to <App extraRoutes>, which the
 * framework's own list above cannot know about (e.g. a self-serve signup page,
 * or an employee's own onboarding form). Without it those routes bounce to "/"
 * before they ever render.
 */
const DataProvider = ({ children, publicPaths = [] }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState(null);
  const [hamburgerMenu, setHamburgerMenu] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const entryPath = window.location.pathname;
    const isLoginPage = entryPath === "/";
    const isPublicPath = isAnonymousPath(entryPath, publicPaths);

    let cancelled = false;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await ApiService.getUser();
        const user = response?.data ?? null;
        if (cancelled) return;

        if (user) {
          const allowed = isAllowedDevice({
            mobileApp: user.mobileApp,
            desktopWeb: user.desktopWeb,
            mobileWeb: user.mobileWeb,
          });
          setUnauthorized(!allowed);
        } else {
          setUnauthorized(false);
        }
        setUserData(user);
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching user:", err);
        setUserData(null);
        setUnauthorized(false);
        setError(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };

    if (isPublicPath && !isLoginPage) {
      setLoading(false);
      setAuthChecked(true);
    } else {
      fetchUser();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Cached data (rosters, filter option lists) belongs to one user in one
  // company. Logging out or switching company drops the whole cache; a plain
  // page reload does not, which is what keeps sessionStorage worth having.
  useEffect(() => {
    setCacheScope(userData ? `${userData.id}:${userData.companyId ?? ""}` : null);
  }, [userData]);

  useEffect(() => {
    if (!authChecked || !userData) return;
    if (location.pathname !== "/") return;

    const params = new URLSearchParams(location.search);
    const ssoReturn = params.get("returnTo");
    const redirectTo =
      (ssoReturn && ssoReturn.startsWith("/") ? ssoReturn : null) ||
      location.state?.from ||
      (userData?.isSupportUser ? "/admin/multi-company-setup" : "/admin");
    navigate(redirectTo, { replace: true });
  }, [authChecked, userData, location.pathname, location.search, location.state, navigate]);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const response = await ApiService.logout();
      const ssoLogoutUrl = response?.data?.ssoLogoutUrl;
      if (isSsoEnabled() && ssoLogoutUrl) {
        window.location.replace(ssoLogoutUrl);
        return;
      }
      setUserData(null);
      setIsLoggingOut(false);
      navigate(isSsoEnabled() ? "/" : "/login");
    } catch (err) {
      console.error("Logout error:", err);
      setUserData(null);
      setIsLoggingOut(false);
      // Logging out from the device-block screen is a login problem, not a device
      // one, so drop the unauthorized screen and let the login page show.
      setUnauthorized(false);
      navigate(isSsoEnabled() ? "/" : "/login");
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
      isLoggingOut,
    }),
    [userData, loading, error, hamburgerMenu, logout, isLoggingOut]
  );

  const isPublicPath = isAnonymousPath(location.pathname, publicPaths);

  if (!authChecked && !isPublicPath) {
    return <AuthCheckingScreen />;
  }

  if (unauthorized && !isPublicPath) {
    return (
      <UnauthorizedScreen
        userData={userData}
        onLogout={logout}
        isLoggingOut={isLoggingOut}
      />
    );
  }

  return (
    <DataContext.Provider value={value}>
      {isLoggingOut && <SigningOutOverlay />}
      {children}
    </DataContext.Provider>
  );
};

DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
  publicPaths: PropTypes.arrayOf(PropTypes.string),
};

export { DataProvider };
