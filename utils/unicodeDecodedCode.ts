// Some API responses double-encode unicode (e.g. Bangla text arrives as the
// literal escape sequence "সিটি" instead of being decoded).
// Plain English text has no \uXXXX sequences, so it passes through untouched.
export const decodeUnicode = (v: string) => {
  if (typeof v !== "string" || !/\\u[0-9a-fA-F]{4}/.test(v)) return v;
  try {
    return JSON.parse(`"${v.replace(/"/g, '\\"')}"`);
  } catch {
    return v.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  }
};
