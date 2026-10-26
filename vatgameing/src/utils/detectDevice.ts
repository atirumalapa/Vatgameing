export type DeviceKind =
  | "macbook"
  | "windows"
  | "android"
  | "iphone"
  | "tablet"
  | "laptop";

// navigator.userAgentData isn't in the TS DOM lib yet (Chromium-only API)
interface NavigatorUAData {
  platform: string;
}

// Exact device models aren't exposed to the browser, so we match by OS.
export function detectDevice(): DeviceKind {
  const nav = navigator as Navigator & { userAgentData?: NavigatorUAData };
  const source = (nav.userAgentData?.platform || nav.userAgent).toLowerCase();
  // Shortest screen side, so a big phone held sideways doesn't count as a tablet
  const shortestSide = Math.min(window.screen.width, window.screen.height);

  if (/iphone|ipod|^ios$/.test(source)) return "iphone";
  // Older iPads still say "iPad" in the user agent
  if (/ipad/.test(source)) return "tablet";
  // Samsung and other Android tablets report as Android
  if (/android/.test(source)) return shortestSide >= 600 ? "tablet" : "android";
  // Newer iPads report as macOS, but Macs don't have touchscreens
  if (/mac/.test(source)) return nav.maxTouchPoints > 1 ? "tablet" : "macbook";
  if (/windows|win32|win64/.test(source)) return "windows";
  // Linux, ChromeOS, Samsung DeX, etc.
  return "laptop";
}
