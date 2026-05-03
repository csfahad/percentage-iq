# IGNOU Percentage IQ

Chrome Extension (Manifest V3) that reads IGNOU grade card data directly on `https://gradecard.ignou.ac.in/` and calculates percentage using programme-specific rules.

## Features

- Auto-detect programme type from login dropdown, URL, and parsed page data
- Scrape grade table with header-driven column mapping (resilient to column order changes)
- Handle duplicate course codes (keeps best/latest row by TEE marks)
- Handle absent/incomplete courses (`Ab`, `--`, empty) and exclude from completed calculations
- Handles project/dissertation courses as single-component marks
- Floating Shadow DOM panel with:
    - Loading/success/partial/no-data/error states
    - Animated percentage donut
    - Division badge
    - Subject-wise breakdown
    - Copy summary + print actions
- Popup fallback calculator for manual entry
- Uses `chrome.storage.local` for login-to-result state handoff and popup persistence

## File Structure

```text
ignou-percentage-iq/
├── manifest.json
├── content/
│   ├── content.js
│   ├── scraper.js
│   ├── calculator.js
│   └── ui.js
├── popup/
│   ├── popup.html
│   └── popup.js
├── background/
│   └── service_worker.js
├── assets/
│   └── icon.png
└── README.md
```
