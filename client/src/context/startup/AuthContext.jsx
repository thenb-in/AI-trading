import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiService } from "../../services/startup/ApiService";
import { isAllowedDevice } from "../../utils/startup/deviceUtils";
import PropTypes from "prop-types";
import { DataContext } from "./DataContext";

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
          const redirectTo = location.state?.from || (user?.isSadmin ? "/admin/multi-company-setup" : "/admin");
          navigate(redirectTo, { replace: true });
        }
      } catch (err) {
        // Check if this is a session expiration error
        const isSessionExpired = err?.requiresLogin === true || err?.status === 400;
        
        if (isSessionExpired) {
          // Session expired - silently handle, don't log as error
          setUserData(null);
          setError(null); // Clear error for session expiration
          
          // Only redirect to login if not on a public path and not already on the login page
          if (!isPublicPath && !isLoginPage) {
            navigate("/", { state: { from: location }, replace: true });
          }
        } else {
          // Other errors - log them
          console.error("Error fetching user:", err);
          setUserData(null);
          setError(err);
          
          // Only redirect to login if not on a public path and not already on the login page
          if (!isPublicPath && !isLoginPage) {
            navigate("/", { state: { from: location }, replace: true });
          }
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
  const value = {
    userData,
    setUserData,
    loading,
    error,
    hamburgerMenu,
    setHamburgerMenu,
    logout: async () => {
      try {

        
        // Call the logout API
        await ApiService.logout();
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        // Clear user data and redirect
        setUserData(null);
        navigate("/");
      }
    },
  };

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
