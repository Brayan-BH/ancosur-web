This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Formularios → CRM

Todos los formularios del sitio (proyectos, promociones, popup de campaña, WhatsApp, inversionistas, compramos tu
terreno y socio referido) envían a la ruta propia `/api/leads` (y sus alias `/api/investment-leads`,
`/api/terrain-leads`, `/api/referral-leads`). Esa ruta corre en el servidor, normaliza los datos y registra el lead en
el CRM nuevo con `POST {CRM_API_URL}/api/integraciones/leads` (ver `app/api/_shared/crm.ts`).

Variables de entorno del servidor (en Cloudflare, como *secrets*; nunca con prefijo `NEXT_PUBLIC_`):

| Variable | Valor |
|---|---|
| `CRM_API_URL` | URL pública de la API del CRM nuevo, p. ej. `https://api-crm.ancosur.pe` |
| `CRM_API_KEY` | Una de las claves de `INTEGRATION_API_KEYS` de esa API |

Sin estas variables los formularios responden «No pudimos registrar tus datos» y el error queda en los logs.
