# @behbehani-cpo/data-access-mobile

Axios-based API clients for the Behbehani CPO React Native / Expo mobile app.

## Why a separate lib?

`libs/data-access` is Angular-only (imports `@angular/core`, `@angular/common/http`, rxjs). Metro must never see those packages. This lib is a clean sibling with zero Angular deps — just axios and Zod (via `@behbehani-cpo/shared-types`).

## Usage

`apps/mobile/src/services/http.ts` creates the axios instance and injects it when constructing each client:

```ts
import axios from 'axios';
import { AuthApiClient } from '@behbehani-cpo/data-access-mobile';

const axiosInstance = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL });
const authClient = new AuthApiClient(axiosInstance);
```

## Clients

| Client | Endpoints covered |
|---|---|
| `AuthApiClient` | `POST /v1/auth/login`, `POST /v1/auth/refresh`, `GET /v1/me` |
| `ListingsPublicApiClient` | `GET /v1/public/listings`, `GET /v1/public/listings/featured`, `GET /v1/public/listings/low-mileage`, `GET /v1/public/listings/:slug` |
| `InspectionsPublicApiClient` | `GET /v1/public/inspection-sign/:token`, `POST /v1/public/inspection-sign/:token` (placeholder — pending storefront-session endpoints) |

## Constraints

- No `@angular/*` imports — ever.
- No `rxjs` — clients return `Promise<T>`.
- Every API response is validated with Zod `.parse()` at the boundary before returning to the caller.
- Clients accept an `AxiosInstance` constructor arg — they never create their own instance. The app-level `http.ts` owns the instance (with its auth interceptors).
