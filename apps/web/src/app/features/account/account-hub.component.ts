import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignInModalService } from '../auth/sign-in-modal.service';

/**
 * Account Hub — customer-facing dashboard overview page.
 * v2: grouped tile layout matching approved mockup account-v2.html §1.
 */
@Component({
  selector: 'app-account-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    @if (!auth.isSignedIn()) {
      <!-- Guest gate -->
      <header class="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
        <div class="container-page py-10 sm:py-14">
          <div class="mx-auto max-w-4xl">
            <h1
              class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white"
            >
              {{ 'account.hub.signInRequired.title' | translate }}
            </h1>
            <p class="mt-2 text-[14px] text-white/80">
              {{ 'account.hub.signInRequired.body' | translate }}
            </p>
          </div>
        </div>
      </header>
      <main class="container-page py-8 sm:py-10 max-w-4xl mx-auto">
        <div class="rounded-3xl border border-line bg-white p-10 text-center text-[14px] text-muted shadow-brand-sm">
          <p>{{ 'account.myBookings.signInRequired.body' | translate }}</p>
        </div>
      </main>
    } @else {

      <main class="container-page py-8 sm:py-10">
        <div class="max-w-4xl mx-auto">

          <!-- ───────────── A. HERO CARD ───────────── -->
          <div
            class="rounded-3xl p-6 mb-4 flex items-start justify-between gap-4"
            style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%)"
          >
            <div class="flex items-center gap-4">
              <!-- 96×96 white circle avatar -->
              <div
                class="w-24 h-24 rounded-full bg-white flex items-center justify-center flex-shrink-0"
                style="box-shadow: 0 4px 16px rgba(0,0,0,.2)"
              >
                <span class="font-display font-bold text-brand-900 text-2xl">{{ userInitial() }}</span>
              </div>
              <div>
                <p class="font-display font-bold text-white text-[22px] leading-tight">
                  {{ 'account.hub.greeting' | translate: { name: userName() } }}
                </p>
                @if (userEmail() || userMobile()) {
                  <p class="text-white/80 text-sm mt-1">
                    {{ userEmail() }}{{ userEmail() && userMobile() ? ' · ' : '' }}{{ userMobile() }}
                  </p>
                }
                @if (createdDate()) {
                  <p class="text-white/70 text-xs mt-1">
                    {{ 'account.hub.memberSince' | translate: { date: createdDate() } }}
                  </p>
                }
              </div>
            </div>

            <!-- Sign out text-link -->
            <button
              (click)="onSignOut()"
              type="button"
              class="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium flex-shrink-0 mt-1 bg-transparent border-0 cursor-pointer"
            >
              <!-- sign-out icon -->
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              {{ 'account.hub.tiles.signOut.title' | translate }}
            </button>
          </div>

          <!-- ───────────── B. STATUS BANNER ───────────── -->
          <!-- suspended state (existing key) -->
          @if (userStatus() === 'suspended') {
            <div class="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <svg class="w-5 h-5 text-brand-700 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <p class="text-brand-800 font-semibold text-sm flex-1">
                {{ 'account.hub.statusBanner.suspended' | translate }}
              </p>
            </div>
          }

          <!-- pending verification banner — show if email not verified -->
          @if (userStatus() === 'pending_verification' && !emailVerifiedAt()) {
            <div class="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <svg class="w-5 h-5 text-brand-700 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <div class="flex-1">
                <p class="text-brand-800 font-semibold text-sm">
                  {{ 'account.hub.banner.unverifiedEmailTitle' | translate }}
                </p>
                <p class="text-brand-700 text-xs mt-0.5">
                  {{ 'account.hub.banner.unverifiedEmailBody' | translate }}
                </p>
              </div>
              <a
                [routerLink]="['/' + locale() + '/account/profile']"
                class="ml-auto flex-shrink-0 bg-brand-700 text-white rounded-full px-4 py-2 text-xs font-bold hover:bg-brand-800 transition-colors"
              >
                {{ 'account.hub.banner.verifyEmailCta' | translate }}
              </a>
            </div>
          }

          <!-- ───────────── C. PENDING ACTIONS STRIP ───────────── -->
          <div class="mb-6">
            <p class="text-muted text-[11px] font-semibold uppercase tracking-wider mb-3">
              {{ 'account.hub.pendingActions.label' | translate }}
            </p>
            <div class="flex gap-3 overflow-x-auto pb-1">
              <!-- Respond to offer card (mock) -->
              <div class="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex-shrink-0 min-w-[280px]">
                <div class="flex items-start gap-3">
                  <div class="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-ink text-[13px]">{{ 'account.hub.pendingActions.offerTitle' | translate }}</p>
                    <p class="text-muted text-xs mt-0.5">{{ 'account.hub.pendingActions.offerBody' | translate }}</p>
                    <a [routerLink]="['/' + locale() + '/my-bookings']" class="mt-2 inline-block text-brand-700 text-xs font-bold hover:underline">
                      {{ 'account.hub.pendingActions.offerCta' | translate }}
                    </a>
                  </div>
                </div>
              </div>
              <!-- Maintenance due card (mock) -->
              <div class="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex-shrink-0 min-w-[280px]">
                <div class="flex items-start gap-3">
                  <div class="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-ink text-[13px]">{{ 'account.hub.pendingActions.maintenanceTitle' | translate }}</p>
                    <p class="text-muted text-xs mt-0.5">{{ 'account.hub.pendingActions.maintenanceBody' | translate }}</p>
                    <a [routerLink]="['/' + locale() + '/account/maintenance']" class="mt-2 inline-block text-brand-700 text-xs font-bold hover:underline">
                      {{ 'account.hub.pendingActions.maintenanceCta' | translate }}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ───────────── D. TILE GROUPS ───────────── -->

          <!-- GROUP 1: PROFILE & SETTINGS -->
          <div class="mb-8">
            <p class="text-muted text-[11px] font-semibold uppercase tracking-wider mb-3">
              {{ 'account.hub.groups.profileSettings' | translate }}
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

              <!-- Profile -->
              <a [routerLink]="['/' + locale() + '/account/profile']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.profile.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.profile.desc' | translate }}</p>
              </a>

              <!-- Addresses (with count badge) -->
              <a [routerLink]="['/' + locale() + '/account/addresses']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div class="flex items-start justify-between gap-1">
                  <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.addresses.title' | translate }}</p>
                  @if (addressCount() > 0) {
                    <span class="bg-brand-100 text-brand-700 text-[11px] font-bold rounded-full px-2 py-0.5 flex-shrink-0">{{ addressCount() }}</span>
                  }
                </div>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.addresses.desc' | translate }}</p>
              </a>

              <!-- Notifications -->
              <a [routerLink]="['/' + locale() + '/account/notifications']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.notifications.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.notifications.desc' | translate }}</p>
              </a>

              <!-- Security -->
              <a [routerLink]="['/' + locale() + '/account/security']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.security.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.security.desc' | translate }}</p>
              </a>
            </div>
          </div>

          <!-- GROUP 2: BUYING -->
          <div class="mb-8">
            <p class="text-muted text-[11px] font-semibold uppercase tracking-wider mb-3">
              {{ 'account.hub.groups.buying' | translate }}
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

              <!-- Favorites (with count) -->
              <a [routerLink]="['/' + locale() + '/my-bookings/saved-cars']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </div>
                <div class="flex items-start justify-between gap-1">
                  <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.favorites.title' | translate }}</p>
                  @if (favoritesCount() > 0) {
                    <span class="bg-brand-100 text-brand-700 text-[11px] font-bold rounded-full px-2 py-0.5 flex-shrink-0">{{ favoritesCount() }}</span>
                  }
                </div>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.favorites.desc' | translate }}</p>
              </a>

              <!-- Saved Searches — Coming Soon Q3 2026 -->
              <a [routerLink]="['/' + locale() + '/account/saved-searches']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative opacity-90 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.savedSearches.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.savedSearches.desc' | translate }}</p>
                <div class="mt-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                    {{ 'account.comingSoon.eta.q3_2026' | translate }}
                  </span>
                </div>
              </a>

              <!-- Inspections (with count) -->
              <a [routerLink]="['/' + locale() + '/my-bookings']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div class="flex items-start justify-between gap-1">
                  <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.inspections.title' | translate }}</p>
                  @if (inspectionsCount() > 0) {
                    <span class="bg-brand-100 text-brand-700 text-[11px] font-bold rounded-full px-2 py-0.5 flex-shrink-0">{{ inspectionsCount() }}</span>
                  }
                </div>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.inspections.desc' | translate }}</p>
              </a>

              <!-- Purchase History — Coming Soon Q3 2026 -->
              <a [routerLink]="['/' + locale() + '/account/orders']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative opacity-90 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.orders.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.orders.desc' | translate }}</p>
                <div class="mt-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                    {{ 'account.comingSoon.eta.q3_2026' | translate }}
                  </span>
                </div>
              </a>
            </div>
          </div>

          <!-- GROUP 3: OWNING -->
          <div class="mb-8">
            <p class="text-muted text-[11px] font-semibold uppercase tracking-wider mb-3">
              {{ 'account.hub.groups.owning' | translate }}
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

              <!-- Documents — Coming Soon Q3 2026 -->
              <a [routerLink]="['/' + locale() + '/account/documents']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative opacity-90 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.documents.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.documents.desc' | translate }}</p>
                <div class="mt-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                    {{ 'account.comingSoon.eta.q3_2026' | translate }}
                  </span>
                </div>
              </a>

              <!-- Maintenance — Coming Soon Q3 2026 -->
              <a [routerLink]="['/' + locale() + '/account/maintenance']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative opacity-90 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.maintenance.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.maintenance.desc' | translate }}</p>
                <div class="mt-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                    {{ 'account.comingSoon.eta.q3_2026' | translate }}
                  </span>
                </div>
              </a>

              <!-- Financing — Coming Soon Q4 2026 -->
              <a [routerLink]="['/' + locale() + '/account/financing']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative opacity-90 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.financing.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.financing.desc' | translate }}</p>
                <div class="mt-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                    {{ 'account.comingSoon.eta.q4_2026' | translate }}
                  </span>
                </div>
              </a>

              <!-- Returns — Coming Soon Q4 2026 -->
              <a [routerLink]="['/' + locale() + '/account/returns']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative opacity-90 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.returns.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.returns.desc' | translate }}</p>
                <div class="mt-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                    {{ 'account.comingSoon.eta.q4_2026' | translate }}
                  </span>
                </div>
              </a>
            </div>
          </div>

          <!-- GROUP 4: ENGAGEMENT -->
          <div class="mb-8">
            <p class="text-muted text-[11px] font-semibold uppercase tracking-wider mb-3">
              {{ 'account.hub.groups.engagement' | translate }}
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

              <!-- Reviews — Coming Soon Q4 2026 -->
              <a [routerLink]="['/' + locale() + '/account/reviews']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative opacity-90 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.reviews.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.reviews.desc' | translate }}</p>
                <div class="mt-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                    {{ 'account.comingSoon.eta.q4_2026' | translate }}
                  </span>
                </div>
              </a>

              <!-- Referrals — Coming Soon 2027 -->
              <a [routerLink]="['/' + locale() + '/account/referrals']"
                 class="account-tile bg-white border border-line rounded-2xl p-5 block relative opacity-90 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(30,58,138,.18)] hover:-translate-y-0.5">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
                  </svg>
                </div>
                <p class="font-display font-bold text-[15px] text-ink">{{ 'account.hub.tiles.referrals.title' | translate }}</p>
                <p class="text-[13px] text-muted mt-0.5">{{ 'account.hub.tiles.referrals.desc' | translate }}</p>
                <div class="mt-2">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                    {{ 'account.comingSoon.eta.year_2027' | translate }}
                  </span>
                </div>
              </a>

              <!-- empty placeholder slots — maintain 4-col grid on md -->
              <div class="hidden md:block"></div>
              <div class="hidden md:block"></div>
            </div>
          </div>

        </div><!-- /max-w-4xl -->
      </main>
    }
  `,
})
export class AccountHubComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly signInModal = inject(SignInModalService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);

  readonly locale = computed(() => this.language.current());

  private readonly user = computed(() => this.auth.user());
  readonly userName = computed(() => this.user()?.fullName ?? '');
  readonly userEmail = computed(() => this.user()?.email ?? null);
  readonly userMobile = computed(() => this.user()?.mobile ?? null);

  /** First letter of full name, uppercased, for the avatar circle */
  readonly userInitial = computed(() => {
    const name = this.user()?.fullName ?? '';
    return name.trim().charAt(0).toUpperCase() || '?';
  });

  readonly userStatus = computed(() => {
    const status = (this.user() as any)?.status;
    return (status as 'active' | 'suspended' | 'pending_verification') ?? 'active';
  });

  /** emailVerifiedAt — null means unverified */
  readonly emailVerifiedAt = computed(() => (this.user() as any)?.emailVerifiedAt ?? null);

  readonly createdDate = computed(() => {
    const iso = (this.user() as any)?.createdAt;
    if (!iso) return null;
    try {
      const date = new Date(iso);
      return date.toLocaleDateString(this.locale() === 'ar' ? 'ar-KW' : 'en-KW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  });

  /** Address count — wired to user data where available */
  readonly addressCount = computed(() => {
    const addresses = (this.user() as any)?.addresses;
    return Array.isArray(addresses) ? addresses.length : 0;
  });

  /** Favorites count — wired to user data where available */
  readonly favoritesCount = computed(() => {
    const count = (this.user() as any)?.savedListingsCount;
    return typeof count === 'number' ? count : 0;
  });

  /** Active inspections count — wired to user data where available */
  readonly inspectionsCount = computed(() => {
    const count = (this.user() as any)?.activeInspectionsCount;
    return typeof count === 'number' ? count : 0;
  });

  constructor() {
    // Open sign-in modal if guest (SSR-safe)
    effect(
      () => {
        if (isPlatformBrowser(this.platformId) && !this.auth.isSignedIn()) {
          this.signInModal.open();
        }
      },
      { allowSignalWrites: true },
    );

    // Set page title
    effect(() => {
      const key = 'account.hub.metaTitle';
      this.translate.get(key).subscribe((titleStr) => {
        this.title.setTitle(titleStr);
        this.meta.updateTag({
          name: 'description',
          content: titleStr,
        });
      });
    });
  }

  onSignOut(): void {
    this.auth.signOut().subscribe(() => {
      const locale = this.locale();
      this.router.navigate(['/', locale]);
    });
  }
}
