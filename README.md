# interpretingWorks — Landing Site

Production website for **interpretingWorks** by Language Link Corporation.  
Built with Astro 7 · Tailwind CSS 4 · React 19 · TypeScript.

Live domain → `https://interpreting.works`

---

## Pages

| Route | Description |
|---|---|
| `/` | Home — hero, platform screenshots, features, testimonial, mobile app, trust badges, FAQ |
| `/about/` | About Us — company story, team photos, founders narrative |
| `/faq/` | FAQ — interactive accordion (For Requesters / For Interpreters) |
| `/contact/` | Contact Us — form + contact cards + team photo |

---

## Tech stack

- **[Astro 7](https://astro.build)** — static output, zero JS by default
- **[Tailwind CSS 4](https://tailwindcss.com)** via `@tailwindcss/vite`
- **[React 19](https://react.dev)** — used only for interactive islands (`client:load`)
- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)** — auto sitemap at `/sitemap-index.xml`
- **SEO / GEO / AEO** — canonical, Open Graph, geo meta tags, JSON-LD schemas (Organization, SoftwareApplication, FAQPage, LocalBusiness)

## React islands

| Component | Purpose |
|---|---|
| `ScreenshotTabs.tsx` | Interactive screenshot tab switcher on home page |
| `FaqTabs.tsx` | FAQ accordion with Requesters / Interpreters tabs |

---

## Development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # production build → dist/
npm run preview    # preview production build
```

---

## Deployment

Static output — deploy to any CDN (Netlify, Vercel, Cloudflare Pages).

**Contact form**: posts to `src/pages/api/contact.ts` (Vercel function), which emails each message through Resend's REST API. Logic and tests live in `src/lib/contact.ts` / `src/lib/contact.test.ts` (`bun test src/lib`). Set these Vercel env vars:

- `RESEND_API_KEY`: key from resend.com
- `CONTACT_TO_EMAIL`: where messages go (comma separated for several)
- `CONTACT_FROM_EMAIL` (optional): verified sender, e.g. `interpretingWorks <hello@interpreting.works>`. Defaults to Resend's test sender, which only delivers to the Resend account owner until a domain is verified.

Until the first two are set, the form shows a friendly error and logs `[contact] failed:not-configured`.

---

## Images

All images are real (non-AI) assets from the original site, stored in `public/img/`.  
No AI-generated images are used.

---

## TODO before going live

- [ ] `src/layouts/BaseLayout.astro` — fill `[COMPLETAR]` telephone, email, address in the Organization JSON-LD schema
- [ ] `src/layouts/BaseLayout.astro` — add sameAs links (LinkedIn, Facebook)
- [x] `public/img/og-default.png`: Open Graph image (1200×630)
- [ ] Contact form: set `RESEND_API_KEY` and `CONTACT_TO_EMAIL` in Vercel
- [ ] App Store / Google Play links in mobile section
- [ ] `/request-demo/` page
