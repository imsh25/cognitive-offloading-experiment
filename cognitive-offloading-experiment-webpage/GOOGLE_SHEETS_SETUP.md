# Connecting the experiment to Google Sheets

Participants never sign in to Google, and no secret keys are placed in the web page.

## 1. Create the spreadsheet and script
1. Create a new Google Sheet (any name).
2. Open **Extensions > Apps Script**, delete the default code and paste in the contents of `apps-script/Code.gs`.
3. Select the function `setup` and click **Run** once. Approve the permission prompt. This creates the four sheets:
   `Participant Demographics`, `Experimental Responses`, `Behavioural Log`, `Topic and Pointers`.

## 2. Deploy as a Web App
1. **Deploy > New deployment > Web app**.
2. *Execute as:* **Me**. *Who has access:* **Anyone**.
3. Deploy and copy the Web App URL (ends in `/exec`).
4. If you later edit `Code.gs`, use **Deploy > Manage deployments > Edit > New version**; the URL stays the same.

## 3. Point the experiment at the script
Either paste the URL into `CONFIGURED_URL` in `src/config.ts`, or build with
`VITE_SHEETS_ENDPOINT="https://script.google.com/macros/s/XXXX/exec" npm run build`.
Then run `npm run build` and host `dist/index.html` anywhere (GitHub Pages, Netlify, a university server...).

While no URL is configured the page runs in **preview mode** (a small notice is shown at the top): everything
works, but data is only kept in that browser's localStorage under the key `coe_backup`.

## 4. Test before collecting data
Complete one full run (use a shortened test if you wish by temporarily lowering the numbers in `src/config.ts`),
then check that the sheets contain: one Demographics row, two Responses rows (one per condition) and a Behavioural Log.
Delete test rows before real data collection starts. Participant IDs beginning "P-" are generated automatically.

## Data notes
- **Timestamps** are UTC, ISO-8601 (e.g. `2026-03-02T09:41:07.123Z`). `Experiment_Date` is the UTC date.
- **Counterbalancing:** the script assigns each new participant the currently least-used of the four sequences
  (1: A-T1 then B-T2, 2: B-T1 then A-T2, 3: A-T2 then B-T1, 4: B-T2 then A-T1). `Assignment_Method` records
  `server_balanced`, or `client_random_fallback` if the server could not be reached at the start.
- **Saving:** data is saved after each condition and again at the end. The server upserts by participant (and
  condition), and de-duplicates log events, so a retry never creates duplicates or overwrites the first condition.
  If saving fails, the participant sees a retry option and their responses stay on the page.
- **Extra columns** beyond your specification (added at the right-hand end where possible): `Within_Word_Limit`,
  `Help_Guide_Open_Count`, `Tab_Switch_Count`, `Total_Hidden_Seconds`, `Topic_ID` (responses),
  `Assignment_Method`, `Device_Info` (demographics), `Event_ID` (log, used for de-duplication).
- `Submission_Status` is `Completed` (submitted manually within 250-300 words) or `Timed_Out` (auto-saved when the
  12 minutes expired; check `Within_Word_Limit`).
- `Help_Guide_Open_Time` is the first opening and `Help_Guide_Close_Time` the last closing; the duration is the
  total across all openings. Every opening/closing is also in the Behavioural Log.
- **Tab switching** cannot be blocked by a web page. The experiment only detects it (Page Visibility API), shows a
  reminder on return and logs the count and hidden time. Pasting into the essay box is disabled and logged.
- Participants who refresh or close the page mid-task cannot resume; any records already saved remain in the sheet
  with `Completion_Status = In_Progress`.
