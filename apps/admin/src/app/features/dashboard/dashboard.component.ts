import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, of, switchMap, takeUntil } from 'rxjs';

import { formatKwd } from '@behbehani-cpo/shared-utils';
import type {
  DashboardKpisDto,
  DashboardActivityEntry,
  DashboardQuickAction,
  PipelineStageCount,
  DailyValueTile,
} from '@behbehani-cpo/shared-types';
import { AdminDashboardService } from '@behbehani-cpo/data-access';

// ─── Pipeline colour map (brand-800→brand-200 for first 7, slate for last 3) ──
const PIPELINE_COLORS: readonly string[] = [
  'bg-brand-800', // acquired
  'bg-brand-700', // inbound
  'bg-brand-600', // inspection
  'bg-brand-500', // photoshoot
  'bg-brand-400', // reconditioning
  'bg-brand-300', // listed
  'bg-brand-200', // reserved
  'bg-slate-400', // sold
  'bg-slate-300', // delivered
  'bg-slate-200', // closed
];

const PIPELINE_LABEL_COLORS: readonly string[] = [
  'text-slate-700',  // acquired
  'text-slate-700',  // inbound
  'text-slate-700',  // inspection
  'text-slate-700',  // photoshoot
  'text-slate-700',  // reconditioning
  'text-brand-700',  // listed — highlighted
  'text-slate-700',  // reserved
  'text-slate-500',  // sold
  'text-slate-500',  // delivered
  'text-slate-400',  // closed
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatGeneratedAt(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kuwait',
    hour12: false,
  }).format(new Date(iso)) + ' AST';
}

function filsToKwd(filsString: string): string {
  const n = Number(filsString);
  if (Number.isNaN(n)) return '—';
  // fils → KWD: divide by 1000
  return formatKwd(n / 1000);
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffD === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

function actorInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function timeUntil(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(AdminDashboardService);
  private readonly destroy$ = new Subject<void>();
  // Refresh trigger — every emission cancels any in-flight kpis() request
  // (switchMap) so the late response cannot overwrite fresher data.
  // Reviewer C2.
  private readonly reload$ = new Subject<void>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<DashboardKpisDto | null>(null);

  protected readonly greeting = timeOfDayGreeting();
  protected readonly skeletonArr4 = [0, 1, 2, 3];
  protected readonly skeletonArr5 = [0, 1, 2, 3, 4];

  // ─── Helpers exposed to template ──────────────────────────────────────────

  protected readonly filsToKwd = filsToKwd;
  protected readonly relativeTime = relativeTime;
  protected readonly actorInitials = actorInitials;
  protected readonly timeUntil = timeUntil;

  protected formatAt(iso: string): string {
    return formatGeneratedAt(iso);
  }

  protected formatIso(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kuwait',
    }).format(new Date(iso)) + ' AST';
  }

  protected pipelineColor(index: number): string {
    return PIPELINE_COLORS[index] ?? 'bg-slate-200';
  }

  protected pipelineLabelColor(index: number): string {
    return PIPELINE_LABEL_COLORS[index] ?? 'text-slate-500';
  }

  protected pipelinePercent(count: number): number {
    const stages = this.data()?.pipeline.stages ?? [];
    const total = stages.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Wire the reload stream once; every reload$ emission swaps in a fresh
    // kpis() call and cancels any in-flight request (switchMap).
    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          this.error.set(null);
          return this.dashboardService.kpis().pipe(
            catchError(() => {
              this.error.set('Failed to load dashboard.');
              return of(null);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((dto) => {
        this.data.set(dto);
        this.loading.set(false);
      });
    this.reload$.next(); // initial load
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Data loading ──────────────────────────────────────────────────────────

  protected reload(): void {
    this.reload$.next();
  }
}
