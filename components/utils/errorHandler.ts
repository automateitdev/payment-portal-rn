// utils/errorHandler.ts (অথবা যেকোনো helper file-এ রাখো)
export function getErrorMessage(error: any): string {
  // Case 1: RTK Query / Axios-এর স্ট্যান্ডার্ড error shape
  if (error?.data?.errors) {
    const errorsObj = error.data.errors;

    // system_error array আছে কিনা চেক
    if (errorsObj.system_error && Array.isArray(errorsObj.system_error)) {
      // প্রথম message টা নাও (যদি একাধিক থাকে তাহলে join করতে পারো)
      const messages = errorsObj.system_error
        .map((err: any) => err?.message || err?.msg || "")
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(" • ");
      }
    }

    // অন্য কোনো key-তে errors থাকলে (যেমন validation errors)
    for (const key in errorsObj) {
      if (Array.isArray(errorsObj[key])) {
        const msg = errorsObj[key][0]?.message || errorsObj[key][0];
        if (msg) return msg;
      }
    }
  }

  // Case 2: সাধারণ data.message
  if (error?.data?.message) {
    return error.data.message;
  }

  // Case 3: সরাসরি error.message (JS error)
  if (error?.message) {
    return error.message;
  }

  // Default fallback
  return "An unexpected error occurred. Please try again.";
}
