# ICPC Professional Accreditation CMS

Arabic-first administration interface for the International Commission for the Protection of Civilians (ICPC). The platform architecture covers public-site content, Recognition of Prior Learning (RPL), competency assessment, professional accreditation, training programs, governance, quality, finance, and system administration.

## Local development

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run lint
npm run build
```

The default API target is `https://icpc.glanzly-service.de/api/v1`.

Use `VITE_API_BASE_URL` when you need to point the frontend somewhere else, for example:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Local backend seed accounts are documented in the backend handoff. Production test passwords should stay outside the repository.

## Interface identity

- Primary: `#0C3D5E`
- Accent: `#1699D6`
- Primary CTA: `#F0A32A`
- Default locale: Arabic (`rtl`)
- Supported locales: Arabic, English, and Dutch
