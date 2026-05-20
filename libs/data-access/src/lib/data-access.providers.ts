import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { API_CONFIG, type ApiConfig } from './api-config';
import { authInterceptor } from './auth.interceptor';

export function provideDataAccess(config: ApiConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: API_CONFIG, useValue: config },
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ]);
}
