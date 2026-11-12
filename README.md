# Freight ERP — static deployment shell

This repository contains the browser-delivered static website for the Freight ERP foundation. The private application source remains in [Weirdofactory/freight-erp](https://github.com/Weirdofactory/freight-erp).

## Architecture
- GitHub Pages: static website delivery only.
- Supabase Auth: user sign-in and session management.
- Supabase Database: tenant data protected by Row Level Security.
- Supabase Edge Functions: privileged platform operations; the service-role key is never placed in this repository.

## Important security notes
- `config.js` contains only the Supabase publishable key, which is intended for browser use.
- Never add a Supabase service-role key, database password, personal access token, or other secret here.
- Every exposed table must enforce correct RLS policies. Edge Functions must independently validate the caller's JWT and authorization.
- The website is public to load; ERP data and functions must remain protected by Supabase authorization.
- This is an initial static foundation, not a complete ERP or production release.

## GitHub Pages
In the repository, open **Settings → Pages** and choose **Deploy from a branch**, branch `main`, folder `/ (root)`. Save. The expected project URL is `https://weirdofactory.github.io/freight-erp-site/` after GitHub Pages finishes publishing.

## Current scope
- Supabase email/password sign-in
- Authenticated workspace overview
- Platform overview through the JWT-validated `platform-overview` Edge Function
- Company list through the JWT-validated `company-management` Edge Function

The original Next.js server components and server actions have not yet been fully migrated. Additional UI and regression testing are required before production use.