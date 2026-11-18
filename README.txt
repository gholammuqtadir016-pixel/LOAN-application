LOAN APPLICATION - UI REFRESH
==============================
1. Back up your existing src/app/globals.css.
2. Copy the included src/app/globals.css into your existing project.
3. Restart npm run dev.

This is a CSS-only upgrade. It does not touch your Prisma database,
loan API routes, draft autosave, signature handling, or validation.

If your project does not use Tailwind CSS v4, remove the line:
@import "tailwindcss";
from the top of globals.css.
