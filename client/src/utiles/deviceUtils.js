export const getUserAgent = () =>
  typeof navigator !== "undefined" && navigator.userAgent
    ? navigator.userAgent
    : "";

export const isMobileDevice = (ua = getUserAgent()) =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(ua);

export const isInWebView = (ua = getUserAgent()) => {
  if (typeof window === "undefined" || !ua) return false;

  try {
    const isAndroid = /Android/i.test(ua);
    const isIOS = /(iPhone|iPod|iPad)/i.test(ua);

    // iOS WebView: AppleWebKit present but NOT Safari
    const iosWebView = isIOS && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua);

    // Android WebView: detect WV
    const androidWebView =
      isAndroid &&
      (/\bwv\b|; wv\)|\/wv\//i.test(ua) || /Version\/\d+(\.\d+)?/i.test(ua));

    // React Native WebView bridge
    const hasReactNativeBridge =
      !!window.ReactNativeWebView ||
      !!(window.webkit &&
        window.webkit.messageHandlers &&
        window.webkit.messageHandlers.ReactNativeWebView);

    return iosWebView || androidWebView || hasReactNativeBridge;
  } catch (e) {
    return false;
  }
};

/**
 * Check access based on new companySettings flags:
 * - mobileApp  -> allow only when mobile + webview
 * - desktopWeb -> allow only when desktop browser
 * - mobileWeb  -> allow only when mobile browser (not in webview)
 */
export const isAllowedDevice = (settings) => {
  if (!settings) return false;

  const ua = getUserAgent();
  const mobile = isMobileDevice(ua);
  const webview = isInWebView(ua);

  // Mobile App
  if (settings.mobileApp && mobile && webview) return true;

  // Desktop Web
  if (settings.desktopWeb && !mobile) return true;

  // Mobile Web
  if (settings.mobileWeb && mobile && !webview) return true;

  return false;
};
