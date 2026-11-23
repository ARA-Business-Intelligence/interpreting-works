import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// Use VERCEL_URL in preview deploys; use custom domain in production or local
const site = process.env.PUBLIC_SITE_URL
  ?? (process.env.VERCEL_ENV === 'production' || !process.env.VERCEL_URL
    ? 'https://hello.interpreting.works'
    : `https://${process.env.VERCEL_URL}`);

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  adapter: vercel(),
  integrations: [sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
