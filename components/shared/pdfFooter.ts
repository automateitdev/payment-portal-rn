/**
 * Centralized PDF footer used across report PDFs.
 *
 * Vendor name comes from `EXPO_PUBLIC_VENDER` (env-driven, e.g., "Academy").
 * The product suffix ("Institute Management Software") is hardcoded here so
 * changing the brand in the future requires editing only this file.
 */

const VENDOR = process.env.EXPO_PUBLIC_VENDOR || "Academy";
const PRODUCT_SUFFIX = "Institute Management Software";

export const PDF_FOOTER_BRAND = `${VENDOR}-${PRODUCT_SUFFIX}`;

/**
 * Height reserved for the footer at the bottom of every printed page.
 * Used both by the CSS reserve rule and as the fallback `@page` bottom margin.
 */
export const PDF_FOOTER_RESERVE = "14mm";

/**
 * Drop into the `<style>` block of any report HTML.
 *
 * How the footer stays pinned to the physical bottom of *every* page without
 * overlapping content:
 *  - `.pdf-footer` is `position: fixed; bottom: 0`. This print engine anchors
 *    fixed elements to the page content box, and with `@page margin-bottom: 0`
 *    that box reaches the physical page edge — so the footer sits flush at the
 *    bottom of every printed page.
 *  - Content is kept clear of it by a repeating reserve: for table reports,
 *    drop {@link getPdfFooterReserveTfoot} into the main table (a `<tfoot>`
 *    repeats on every page, so its height is subtracted from the usable area
 *    of each page). For non-table reports, the `@page { margin-bottom }`
 *    fallback below reserves the same band.
 */
export const PDF_FOOTER_CSS = `
@page { margin-bottom: ${PDF_FOOTER_RESERVE}; }
.pdf-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12pt;
  padding: 3pt 15mm 2pt;
  background: #fff;
  font-size: 7.5pt;
  color: #888;
  border-top: 1px solid #ddd;
}
.pdf-footer span { white-space: nowrap; }
/* Repeating, invisible per-page reserve for table reports. */
tr.pdf-foot-reserve td,
td.pdf-foot-reserve {
  height: ${PDF_FOOTER_RESERVE};
  padding: 0;
  border: 0;
  background: transparent;
}
`;

/**
 * A `<tfoot>` whose single invisible row reserves the footer's height on
 * every printed page. Drop it inside the report's main `<table>` (right after
 * `<tbody>`). If the table already has a `<tfoot>` (e.g. a totals row), add
 * `<tr class="pdf-foot-reserve"><td colspan="N"></td></tr>` into that instead.
 */
export const getPdfFooterReserveTfoot = (colspan: number): string =>
  `<tfoot><tr class="pdf-foot-reserve"><td colspan="${colspan}"></td></tr></tfoot>`;

/** Default note shown on receipts (where there is no page/date info). */
export const PDF_FOOTER_DEFAULT_NOTE =
  "Note: This Money Receipt was created on a software.";

export interface PdfFooterOptions {
  pageInfo?: string;
  dateTime?: string;
  /**
   * Show the `Page x of y | Date & Time` segment on the right.
   * Defaults to `true` (reports). Set `false` for receipts that have no
   * page/date info.
   */
  showPageDate?: boolean;
  /**
   * Show a note segment.
   * - `true`  → use {@link PDF_FOOTER_DEFAULT_NOTE}
   * - string  → use that custom note text
   * - omitted/`false` → no note
   */
  note?: string | boolean;
}

/**
 * Returns the footer HTML element. Drop right before `</body>`.
 *
 * The left segment ("Powered By: …") is always present. The right side is
 * composed from the optional `note` and `page/date` segments, so a caller can
 * pick either one or show both:
 *   getPdfFooterHtml({ dateTime })                       → Powered By + page/date
 *   getPdfFooterHtml({ note: true, showPageDate: false }) → Powered By + note
 *   getPdfFooterHtml({ note: true, dateTime })            → Powered By + note + page/date
 */
export const getPdfFooterHtml = (opts: PdfFooterOptions = {}): string => {
  const pageInfo = opts.pageInfo ?? "Page 1 of 1";
  const dateTime = opts.dateTime ?? new Date().toLocaleString();
  const showPageDate = opts.showPageDate ?? true;
  const noteText =
    opts.note === true
      ? PDF_FOOTER_DEFAULT_NOTE
      : typeof opts.note === "string"
        ? opts.note
        : "";

  const segments = [`<span>Powered By: ${PDF_FOOTER_BRAND}</span>`];
  if (noteText) segments.push(`<span>${noteText}</span>`);
  if (showPageDate)
    segments.push(
      `<span>${pageInfo} &nbsp;|&nbsp; Date &amp; Time: ${dateTime}</span>`,
    );

  return `<div class="pdf-footer">
  ${segments.join("\n  ")}
</div>`;
};
