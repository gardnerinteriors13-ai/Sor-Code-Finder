# SOR Code Finder & Tenant Report Builder v2.2

A static browser app for Healthy Homes / damp and mould survey work.

## What is included

- Full SOR code book search
- Tenant-friendly report builder
- Internal SOR/action list
- Wording bank
- Custom wording/code entries saved locally in the browser
- Copy report and copy action list buttons
- Click-to-copy controls on SOR search results
- Basic prototype password entry screen

## Prototype password

Default password:

```text
healthyhomes
```

This is only a simple client-side gate for testing on GitHub Pages. It is useful for stopping casual access while the app is being shaped, but it is not proper security. Anyone who inspects the source code can work around it.

To change the password, update the Base64 value in `app.js`:

```js
const AUTH_PASSWORD = atob("aGVhbHRoeWhvbWVz");
```

For example, Base64 encode your new password and replace the value inside `atob(...)`. This only hides the plain text from casual viewing; it is not proper security.

## GitHub Pages setup

Upload these files into the repo root:

- `index.html`
- `style.css`
- `app.js`
- `data.js`
- `manifest.webmanifest`
- `README.md`

Do not upload the containing folder unless you intend to serve the app from a subfolder.

## Notes

The app stores drafts and custom wording in the user's browser using localStorage. No tenant data is sent to a server in this version.
