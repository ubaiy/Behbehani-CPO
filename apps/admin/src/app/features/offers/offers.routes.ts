import { Route } from '@angular/router';

export const offersRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./list/offers-list.component').then((m) => m.OffersListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./detail/offer-detail.component').then((m) => m.OfferDetailComponent),
  },
];
