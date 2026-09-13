# SOR Code Finder & Tenant Report Builder

A small static web app for Healthy Homes / damp and mould survey notes.

## What it does

- Search common SOR codes and works wording
- Click survey findings and recommended works
- Generate a tenant-friendly report
- Generate an internal SOR/action list
- Copy the report or export actions as CSV
- Save drafts locally in the browser
- Add custom wording/code items without editing the source code

## Files

- `index.html` - page layout
- `style.css` - styling and mobile layout
- `data.js` - default wording bank and SOR items
- `app.js` - app behaviour/report generation
- `manifest.webmanifest` - basic install metadata

## Publish with GitHub Pages

1. Go to the repository Settings.
2. Open Pages.
3. Choose `Deploy from a branch`.
4. Select `main` and `/root`.
5. Save.

Your live app will normally be available at:

`https://gardnerinteriors13-ai.github.io/Sor-Code-Finder/`

## Notes

Some items are marked `Non-SOR` or `TBC` where the exact SOR code was not confirmed. Keep those as prompts to check before issuing works orders.
