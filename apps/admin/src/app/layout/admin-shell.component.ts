import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '@behbehani-cpo/data-access';
import { ADMIN_ROLE_LABELS } from '@behbehani-cpo/shared-types';
import { ConfirmModalHostComponent } from '@behbehani-cpo/shared-ui';
import { AdminRoleDirective } from '../core/admin-role.directive';

@Component({
  selector: 'admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AdminRoleDirective, ConfirmModalHostComponent],
  template: `
    <div class="flex h-screen overflow-hidden">

      <!-- ═══════════════════════════════════════
           LEFT SIDEBAR (240px fixed)
      ════════════════════════════════════════ -->
      <aside class="w-60 flex-shrink-0 bg-slate-900 flex flex-col h-full">

        <!-- Brand mark — Morad Yousuf Behbehani twin-peaks lockup mark -->
        <div class="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800">
          <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-brand-700" viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" aria-hidden="true">
              <!-- Two interlocking mountain peaks (outline) — matches the MYB brand mark -->
              <path d="M2 38 L20 4 L38 38 Z" />
              <path d="M26 38 L44 12 L62 38 Z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold tracking-widest text-brand-400 uppercase leading-none">Behbehani CPO</p>
            <p class="text-xs text-slate-500 leading-tight mt-0.5">Back Office</p>
          </div>
        </div>

        <!-- Nav groups — scrollable -->
        <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-5" style="scrollbar-width:thin;scrollbar-color:#334155 transparent" aria-label="Main navigation">

          <!-- Dashboard -->
          <div>
            <a routerLink="/" routerLinkActive="bg-brand-700 text-white" [routerLinkActiveOptions]="{exact:true}"
               class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>
          </div>

          <!-- Inventory -->
          <div>
            <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Inventory</p>
            <div class="space-y-0.5">
              <!-- Listings: visible to any authenticated admin -->
              <a routerLink="/inventory/listings" routerLinkActive="bg-brand-700 text-white"
                 class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Listings
              </a>
              <ng-template [adminRole]="['operations_manager','sales_agent','inspection_officer','finance_officer','content_editor','general_manager','technical_support','customer_support']">
                <a routerLink="/inventory/brands" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5l7 7-7 7-7-7V3z" />
                  </svg>
                  Brands &amp; Models
                </a>
                <a routerLink="/inventory/body-types" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Body Types
                </a>
              </ng-template>
              <!-- Pipeline: same READ_ROLES as the listings API so non-readers don't see a nav item that would 403 on click -->
              <ng-template [adminRole]="['operations_manager','sales_agent','inspection_officer','finance_officer','content_editor','general_manager','technical_support','customer_support']">
                <a routerLink="/inventory/pipeline" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  Pipeline
                </a>
              </ng-template>
            </div>
          </div>

          <!-- Settings -->
          <ng-template [adminRole]="['finance_officer']">
            <div>
              <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Settings</p>
              <div class="space-y-0.5">
                <a routerLink="/settings/pricing-rules" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pricing Rules
                </a>
              </div>
            </div>
          </ng-template>

          <!-- Sales -->
          <div>
            <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Sales</p>
            <div class="space-y-0.5">
              <ng-template [adminRole]="['sales_agent']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Reservations
                </span>
              </ng-template>
              <ng-template [adminRole]="['sales_agent','operations_manager','general_manager','finance_officer']">
                <a routerLink="/operations/orders" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Orders
                </a>
              </ng-template>
              <ng-template [adminRole]="['sales_agent']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Trade-Ins
                </span>
              </ng-template>
            </div>
          </div>

          <!-- Operations -->
          <div>
            <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Operations</p>
            <div class="space-y-0.5">
              <ng-template [adminRole]="['inspection_officer','operations_manager','general_manager']">
                <a routerLink="/operations/inspections" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Inspections
                </a>
              </ng-template>
              <ng-template [adminRole]="['sales_agent','operations_manager','general_manager','finance_officer']">
                <a routerLink="/operations/offers" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Buy Offers
                </a>
              </ng-template>
              <ng-template [adminRole]="['delivery_dispatcher']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Deliveries
                </span>
              </ng-template>
              <ng-template [adminRole]="['operations_manager','maintenance_coordinator','general_manager']">
                <a routerLink="/operations/maintenance" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Maintenance
                </a>
              </ng-template>
              <ng-template [adminRole]="['operations_manager','general_manager','super_admin']">
                <a routerLink="/operations/feature-waitlists" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                  </svg>
                  Waitlists
                </a>
              </ng-template>
              <ng-template [adminRole]="['operations_manager']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Returns
                </span>
              </ng-template>
            </div>
          </div>

          <!-- Customers -->
          <div>
            <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Customers</p>
            <div class="space-y-0.5">
              <ng-template [adminRole]="['customer_support']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Users
                </span>
              </ng-template>
              <ng-template [adminRole]="['content_editor']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Reviews
                </span>
              </ng-template>
              <ng-template [adminRole]="['customer_support']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Support
                </span>
              </ng-template>
            </div>
          </div>

          <!-- Finance -->
          <div>
            <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Finance</p>
            <div class="space-y-0.5">
              <ng-template [adminRole]="['finance_officer']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Financing Applications
                </span>
              </ng-template>
              <ng-template [adminRole]="['finance_officer']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                  Invoices
                </span>
              </ng-template>
              <ng-template [adminRole]="['finance_officer']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                  </svg>
                  Refunds
                </span>
              </ng-template>
            </div>
          </div>

          <!-- Insights -->
          <div>
            <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Insights</p>
            <div class="space-y-0.5">
              <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </span>
              <ng-template [adminRole]="['general_manager']">
                <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Reports
                </span>
              </ng-template>
            </div>
          </div>

          <!-- Reports -->
          <ng-template [adminRole]="['general_manager','operations_manager','finance_officer']">
            <div>
              <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Reports</p>
              <div class="space-y-0.5">
                <a routerLink="/reports/inventory-aging" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Inventory Aging
                </a>
              </div>
            </div>
          </ng-template>

          <!-- Admin group — Users visible to super_admin + general_manager; other items super_admin only -->
          <ng-template [adminRole]="['super_admin', 'general_manager']">
            <div>
              <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Admin</p>
              <div class="space-y-0.5">

                <!-- Users — super_admin + general_manager (general_manager sees table read-only) -->
                <a routerLink="/admin/users" routerLinkActive="bg-brand-700 text-white"
                   class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Users
                </a>

                <!-- Audit Log — super_admin + general_manager (read-only for general_manager) -->
                <ng-container *adminRole="['super_admin', 'general_manager']">
                  <a routerLink="/admin/audit-log" routerLinkActive="bg-brand-700 text-white"
                     class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Audit Log
                  </a>
                </ng-container>

                <!-- Roles & Permissions + Settings — super_admin only -->
                <ng-container *adminRole="['super_admin']">
                  <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                    <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Roles &amp; Permissions
                  </span>
                  <span aria-disabled="true" title="Coming in a later sprint" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
                    <svg class="w-4 h-4 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </span>
                </ng-container>

              </div>
            </div>
          </ng-template>

        </nav>

        <!-- User profile footer -->
        <div class="border-t border-slate-800 px-3 py-3">
          <button
            type="button"
            (click)="toggleUserMenu()"
            class="w-full flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-slate-800 cursor-pointer transition-colors text-left"
            aria-haspopup="true"
            [attr.aria-expanded]="userMenuOpen()"
          >
            <div class="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-white">{{ initials() }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-slate-200 truncate">{{ fullName() }}</p>
              <p class="text-xs text-slate-500 truncate">{{ roleLabel() }}</p>
            </div>
            <svg class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>

          @if (userMenuOpen()) {
            <div class="mt-1 rounded-md bg-slate-800 border border-slate-700 py-1 shadow-lg">
              <button
                type="button"
                (click)="signOut()"
                class="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          }
        </div>

      </aside>

      <!-- ═══════════════════════════════════════
           MAIN COLUMN (topbar + content)
      ════════════════════════════════════════ -->
      <div class="flex-1 flex flex-col overflow-hidden">

        <!-- TOP BAR -->
        <header class="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 gap-4">

          <!-- Brand mark (visible in topbar for context) -->
          <span class="text-sm font-semibold text-slate-700 hidden sm:block">Behbehani CPO &middot; Back office</span>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- Right side actions -->
          <div class="flex items-center gap-3">

            <!-- Notifications bell -->
            <button
              type="button"
              class="relative p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Notifications"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            <!--
              Environment badge.
              STAGING: bg-blue-50 text-blue-700 border-blue-200
              PRODUCTION: swap to bg-red-50 text-red-700 border-red-200
            -->
            <span class="hidden lg:inline-flex items-center rounded-full border bg-blue-50 border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Staging
            </span>

            <!-- User avatar button -->
            <button
              type="button"
              (click)="toggleUserMenu()"
              class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 transition-colors"
              aria-label="User menu"
            >
              <div class="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-white">{{ initials() }}</span>
              </div>
              <span class="hidden md:block text-xs text-slate-700 font-medium max-w-[120px] truncate">{{ fullName() }}</span>
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

          </div>
        </header>

        <!-- CONTENT AREA — scrollable -->
        <main class="flex-1 overflow-y-auto bg-slate-50 p-6">
          <router-outlet />
        </main>

      </div>
    </div>

    <!-- Confirm modal host: renders above all content via native <dialog> -->
    <sui-confirm-modal-host />
  `,
})
export class AdminShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly userMenuOpen = signal(false);

  readonly fullName = computed(() => this.auth.user()?.fullName ?? '');

  readonly initials = computed(() => {
    const name = this.auth.user()?.fullName ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  });

  readonly roleLabel = computed(() => {
    const roles = this.auth.user()?.adminRoles ?? [];
    if (roles.length === 0) return '';
    // Show the first admin role's label; super_admin takes priority.
    const primary = roles.includes('super_admin') ? 'super_admin' : roles[0];
    return ADMIN_ROLE_LABELS[primary] ?? '';
  });

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  signOut(): void {
    this.userMenuOpen.set(false);
    this.auth.signOut().subscribe({
      next: () => {
        void this.router.navigateByUrl('/auth/sign-in', { replaceUrl: true });
      },
    });
  }
}
