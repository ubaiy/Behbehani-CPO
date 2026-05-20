import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // SSR everything for now — listings, dealer pages, VDPs etc. will be
  // configured for selective prerender in a later sprint once we have data.
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
