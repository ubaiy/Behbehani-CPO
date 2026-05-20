import { Route } from '@angular/router';
import { adminAuthGuard, adminRoleGuard } from './core/admin-auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'auth/sign-in',
    loadComponent: () =>
      import('./features/auth/sign-in.component').then(
        (m) => m.AdminSignInComponent,
      ),
  },
  {
    path: '',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./layout/admin-shell.component').then(
        (m) => m.AdminShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'inventory/listings',
        loadComponent: () =>
          import('./features/listings/list/listing-list.component').then(
            (m) => m.ListingListComponent,
          ),
      },
      {
        path: 'inventory/listings/new',
        loadComponent: () =>
          import('./features/listings/edit/listing-edit.component').then(
            (m) => m.ListingEditComponent,
          ),
      },
      {
        path: 'inventory/listings/:id',
        loadComponent: () =>
          import('./features/listings/edit/listing-edit.component').then(
            (m) => m.ListingEditComponent,
          ),
      },
      {
        path: 'inventory/pipeline',
        loadComponent: () =>
          import('./features/listings/pipeline/pipeline-board.component').then(
            (m) => m.PipelineBoardComponent,
          ),
      },
      {
        path: 'inventory/brands',
        loadComponent: () =>
          import('./features/catalog/brands-list.component').then(
            (m) => m.BrandsListComponent,
          ),
      },
      {
        path: 'inventory/brands/:brandId/models',
        loadComponent: () =>
          import('./features/catalog/brand-models-list.component').then(
            (m) => m.BrandModelsListComponent,
          ),
      },
      {
        path: 'inventory/body-types',
        loadComponent: () =>
          import('./features/catalog/body-types-list.component').then(
            (m) => m.BodyTypesListComponent,
          ),
      },
      {
        path: 'settings/pricing-rules',
        loadComponent: () =>
          import('./features/pricing-rules/pricing-rules.component').then(
            (m) => m.PricingRulesComponent,
          ),
      },
      {
        path: 'reports/inventory-aging',
        loadComponent: () =>
          import('./features/reports/aging-overview.component').then(
            (m) => m.AgingOverviewComponent,
          ),
      },
      {
        path: 'operations/inspections',
        loadComponent: () =>
          import('./features/inspections/list/inspection-list.component').then(
            (m) => m.InspectionListComponent,
          ),
      },
      {
        path: 'operations/inspections/:id',
        loadComponent: () =>
          import('./features/inspections/edit/inspection-edit.component').then(
            (m) => m.InspectionEditComponent,
          ),
      },
      {
        path: 'operations/inspections/:id/signoff',
        loadComponent: () =>
          import('./features/inspections/signoff/inspection-signoff.component').then(
            (m) => m.InspectionSignoffComponent,
          ),
      },
      {
        path: 'operations/inspections/:inspectionId/offer/new',
        loadComponent: () =>
          import('./features/offers/create/offer-create.component').then(
            (m) => m.OfferCreateComponent,
          ),
      },
      {
        path: 'operations/offers',
        loadChildren: () =>
          import('./features/offers/offers.routes').then((m) => m.offersRoutes),
      },
      {
        path: 'admin/users',
        loadComponent: () =>
          import('./features/admin-users/users-list.component').then(
            (m) => m.UsersListComponent,
          ),
      },
      {
        path: 'admin/users/:id',
        loadComponent: () =>
          import('./features/admin-users/user-edit.component').then(
            (m) => m.AdminUserEditComponent,
          ),
      },
      {
        path: 'admin/audit-log',
        loadComponent: () =>
          import('./features/admin-audit-log/audit-log.component').then(
            (m) => m.AdminAuditLogComponent,
          ),
      },
      {
        path: 'customers/:customerId/documents',
        canActivate: [adminRoleGuard(['super_admin', 'general_manager', 'customer_support'])],
        loadComponent: () =>
          import('./features/customer-documents/customer-documents-page.component').then(
            (m) => m.CustomerDocumentsPageComponent,
          ),
      },
      {
        path: 'operations/orders',
        loadComponent: () =>
          import('./features/orders/orders-list-page.component').then(
            (m) => m.OrdersListPageComponent,
          ),
      },
      {
        path: 'operations/orders/:orderId',
        loadComponent: () =>
          import('./features/orders/order-detail-page.component').then(
            (m) => m.OrderDetailPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
