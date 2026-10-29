# GRAINORA saved orders — setup

This folder is a separate version of the rice website. Nothing here has been uploaded or deployed automatically. Keep the existing live site until setup is complete.

## What it does

- Saves enquiries in D1 before showing an order reference, such as GR-000001.
- Keeps 10 kg / 25 kg bag choices and quantities 1–4.
- Shows a private tracking link and a separate button to send the order to RAM on WhatsApp. Saving an order does NOT send WhatsApp automatically.
- Provides `/admin.html` for RAM to review orders and update status, quote, payment and courier details.
- Stores tracking-token hashes in the database, not the raw tracking token. Customer tracking does not disclose name, phone or delivery area.
- No online payments, automatic courier integration, email notifications or automatic WhatsApp notifications are included.

## 1. Upload the correct folder contents

Back up the existing GitHub repository first. In the `ramoracle/ricedirect` repository root, upload the CONTENTS of this folder: `public/`, `src/`, `tests/`, `wrangler.jsonc`, `schema.sql`, `package.json`, `.gitignore`, and this guide. Preserve the `public` and `src` folders. Do not upload the enclosing `grainora-orders` folder as an extra nesting level.

IMPORTANT: only `public/` is configured as public assets. Do not set the assets directory to the repository root: that could expose backend/configuration files. Old root-level site files may remain but will not be served by this configuration. Do not delete unrelated repository files.

The Worker name in `wrangler.jsonc` is `ricedirect`. Its D1 database ID was transcribed from your screenshot; verify it against the actual `ricedirect` database before deployment. No API token or password belongs in this file.

Your existing Cloudflare Git build uses `npx wrangler deploy`. Keep that deploy command and use the repository root as the build root. No frontend build command is needed. New deployments should now include a Worker script, not only static assets. If Cloudflare asks to keep existing bindings/configuration, review them rather than overwriting unrelated settings.

## 2. Initialize the database

Cloudflare → Storage & databases → D1 SQLite Database → `ricedirect` → Console.

Paste and execute the CONTENTS of `schema.sql` once. It uses CREATE TABLE IF NOT EXISTS and does not delete existing data. Verify the `orders` table appears. If a table with that name already exists, do not assume its columns match—review first.

The configuration binds this database as `DB`. After the script deployment, check the Worker settings show that binding. If a binding is missing, add D1 database `ricedirect` with the variable name `DB` and redeploy.

## 3. Configure bot protection (required; fails closed without it)

Cloudflare → Turnstile → Add widget. Use a Managed widget and allow only your actual hostname:

`ricedirect.ramprasadrr02.workers.dev`

Use the REAL widget keys, not Cloudflare testing keys. In the Worker → Settings → Variables and secrets add:

- `TURNSTILE_SITE_KEY`: public widget site key (Text).
- `TURNSTILE_SECRET`: private widget secret (Secret).

Never put the secret in HTML, JavaScript, screenshots, chat or GitHub. The Worker verifies the hostname, action and token server-side.

## 4. Set the private admin key

Generate a unique, cryptographically random key using a password manager, or Node.js locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Keep that output private. In Worker Settings → Variables and secrets, add `ADMIN_KEY` as a Secret. Use the generated 43-character key; do not use a phone number, reused password or a key invented by hand. Redeploy after changing configuration.

Open `https://ricedirect.ramprasadrr02.workers.dev/admin.html` after verifying the hostname against your Cloudflare dashboard. Enter the secret key there. Do not paste it into a URL. The key stays in page memory, not localStorage. Refreshing/closing the tab or Sign out clears it. Any person with the key can access orders; rotate it immediately if exposed. Use only your trusted device, protect your Cloudflare/GitHub accounts with MFA and avoid browser extensions you do not trust. This minimal key-based login is not a multi-user role system.

## 5. End-to-end checks before sharing

1. Open the actual workers.dev site and use fake customer details, not a real address.
2. Check 10 kg × 2 shows 20 kg and 25 kg × 4 shows 100 kg.
3. Complete the security check and save one test enquiry.
4. Confirm an order reference and private tracking link appear; save that link. If the network fails, retry in the SAME page before refreshing to reuse its submission token.
5. Open the admin page; confirm the test enquiry exists. Change its status and quote.
6. Refresh the customer tracking page and verify the update.
7. Check wrong/missing admin keys cannot read or edit orders. Check random tracking links return no customer data.
8. Check WhatsApp contains the same order reference and selected bag size. You still have to press Send in WhatsApp.
9. Cancel the test enquiry in admin. Do not treat a saved enquiry as confirmed until price and delivery are agreed.

## Scope and limitations

- Source code and unit/schema checks have been prepared locally. Actual Cloudflare D1/Turnstile integration, deployment and visual/browser checks must be completed before collecting customer information.
- New enquiries have a soft daily cap of 200 (UTC) to reduce free-tier abuse; concurrent submissions may slightly exceed this cap. Turnstile is not a substitute for platform rate limiting. Monitor usage and add Cloudflare rate limits if abuse occurs.
- The same secret token makes retries idempotent while the form page stays open. Reloading starts a new token; it cannot reliably deduplicate a customer's repeated submissions after a reload. One submission per page is intentional.
- Private tracking links grant access to order status. Anyone receiving the link can see it; do not post links publicly. The token is kept in the URL fragment, not in server query logs.
- Full customer contact data is visible only through the authenticated admin API and in your Cloudflare D1 console. Public admin HTML contains no credentials or customer data. Do not upload database exports to GitHub.
- Collect only the delivery area initially; exchange full delivery address privately after confirmation. Inform customers how to request deletion. Review applicable privacy requirements, retention and account access before real use.
- Customer data is not auto-deleted. Establish a retention period and securely export/back up orders through D1 as needed. The admin currently lists the newest 50 with a Load older orders button; delete/export UI is not implemented.
- Payments are manually recorded labels, not bank verification. Status updates are operator-entered; no automatic message is sent.
- Free-tier quotas and provider policies can change. Quota exhaustion can make ordering unavailable. The WhatsApp enquiry link remains available as a fallback; no paid plan is enabled by this code.

## Documentation

- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
