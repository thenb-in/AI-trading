import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiService } from "@services/ApiService";
import { setCacheScope } from "@services/cacheManager";
import { isAllowedDevice } from "../utils/deviceUtils";
import PropTypes from "prop-types";
import { DataContext } from "./DataContext";
import {
  SigningOutOverlay,
  AuthCheckingScreen,
  UnauthorizedScreen,
} from "./AuthScreens";

const DataProvider = ({ children }) => {
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
    const isPublicPath =
      entryPath === "/" ||
      entryPath === "/signup" ||
      entryPath === "/get-started"
      entryPath === "/forgot-password" ||
      entryPath.startsWith("/signup/") ||
      entryPath.startsWith("/forgot-password/");

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
  }, [location, navigate]);

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
      setUserData(null);
      if (ssoLogoutUrl) {
        window.location.replace(ssoLogoutUrl);
        return;
      }
      setIsLoggingOut(false);
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      setUserData(null);
      setIsLoggingOut(false);
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
      isLoggingOut,
    }),
    [userData, loading, error, hamburgerMenu, logout, isLoggingOut]
  );

  const publicExact = new Set(["/", "/signup", "/forgot-password"]);
  const isPublicPath =
    publicExact.has(location.pathname) ||
    location.pathname.startsWith("/signup/") ||
    location.pathname.startsWith("/forgot-password/");

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
};

export { DataProvider };
