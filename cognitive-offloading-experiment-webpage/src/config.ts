/**
 * EXPERIMENT CONFIGURATION
 *
 * 1. Deploy apps-script/Code.gs as a Google Apps Script Web App
 *    (see GOOGLE_SHEETS_SETUP.md).
 * 2. Paste the Web App URL ("https://script.google.com/macros/s/.../exec") below,
 *    or provide it at build time as VITE_SHEETS_ENDPOINT.
 *
 * The URL is not a secret credential: it only accepts the data format defined in
 * Code.gs and gives no access to the spreadsheet itself.
 *
 * If no URL is configured the page runs in PREVIEW MODE: the whole experiment works,
 * but responses are only kept in this browser's localStorage (key "coe_backup").
 */
const CONFIGURED_URL = "https://script.google.com/macros/s/AKfycbz1LJMn_osncxsRyvfNU5nTSLFJXleEMX0GI9rUaPkW36AhKvOSlMcTCM0Fn9uWNOxH/exec";

const envUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  ?.VITE_SHEETS_ENDPOINT;

export const ENDPOINT: string = (CONFIGURED_URL || envUrl || "").trim();
export const DEMO_MODE: boolean = ENDPOINT === "";

export const WRITING_SECONDS = 12 * 60;
export const BREAK_SECONDS = 60;
export const MIN_WORDS = 250;
export const MAX_WORDS = 300;
