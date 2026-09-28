/**
 * Centralized Vendor configuration and utilities.
 * Accesses `EXPO_PUBLIC_VENDOR` once and provides consistent vendor information across the app.
 */

const rawVendor = process.env.EXPO_PUBLIC_VENDOR?.trim() || "Academy";

export const VENDOR = rawVendor;
export const VENDOR_UPPER = rawVendor.toUpperCase();

export const isRKEMS =
  VENDOR_UPPER === "RKEMS" ||
  VENDOR_UPPER === "RK" ||
  VENDOR_UPPER.startsWith("RK");
export const isAcademy = VENDOR_UPPER === "ACADEMY";

// Display brand / vendor name
export const VENDOR_NAME = isRKEMS ? "RKEMS" : rawVendor;

// App / Portal name ("EmsPay" for RKEMS, "AutoPay" for others)
export const APP_PREFIX = isRKEMS ? "Ems" : "Auto";
export const APP_SUFFIX = "Pay";
export const APP_NAME = `${APP_PREFIX}${APP_SUFFIX}`;

// System / Software title variants
export const VENDOR_SYSTEM_NAME = `${VENDOR_NAME} Institute Management System`;
export const VENDOR_SYSTEM_NAME_DASH = `${VENDOR_NAME}-Institute Management System`;
export const VENDOR_SOFTWARE_NAME = `${VENDOR_NAME}-Institute Management Software`;

// Ready-to-use footer / badge texts
export const SECURED_BY_TEXT = `Secured by ${VENDOR_SYSTEM_NAME}`;
export const POWERED_BY_SYSTEM_TEXT = `Powered By: ${VENDOR_SYSTEM_NAME_DASH}`;
export const POWERED_BY_SOFTWARE_TEXT = `Powered By: ${VENDOR_SOFTWARE_NAME}`;

export const vendorConfig = {
  vendor: VENDOR,
  vendorUpper: VENDOR_UPPER,
  vendorName: VENDOR_NAME,
  appName: APP_NAME,
  isRKEMS,
  isAcademy,
  systemName: VENDOR_SYSTEM_NAME,
  systemNameDash: VENDOR_SYSTEM_NAME_DASH,
  softwareName: VENDOR_SOFTWARE_NAME,
  securedByText: SECURED_BY_TEXT,
  poweredBySystemText: POWERED_BY_SYSTEM_TEXT,
  poweredBySoftwareText: POWERED_BY_SOFTWARE_TEXT,
};

export default vendorConfig;
