import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  computed,
  signal,
} from '@angular/core';

/**
 * Reusable signature pad for the public inspection-signing page. Uses
 * **pointer events** (not mouse) so finger + stylus on tablets and phones
 * work correctly — per feedback `feedback_inspection_ux.md`. Emits an SVG
 * string sized to the canvas's actual dimensions whenever the user lifts
 * the pen.
 *
 * Output format: a single `<svg>` containing one polyline per stroke. Kept
 * intentionally simple (~ matches `CustomerSignSchema.drawnSignatureSvg`
 * max=50KB) — no smoothing, no Bézier interpolation; the inspector-facing
 * PDF only needs a recognizable signature, not a fine-art rendering.
 */
@Component({
  selector: 'app-signature-pad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #wrap
      class="relative h-40 w-full overflow-hidden rounded-md border-2 border-dashed border-line-2 bg-surface-soft/40"
      style="touch-action: none;"
    >
      @if (isEmpty()) {
        <p class="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-xs text-muted-2">
          {{ placeholder }}
        </p>
      }
      <svg
        #svg
        class="absolute inset-0 h-full w-full"
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="padAriaLabel()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointerleave)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
      >
        @for (stroke of strokes(); track $index) {
          <polyline
            [attr.points]="stroke"
            fill="none"
            stroke="currentColor"
            class="text-ink"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }
      </svg>
      <button
        type="button"
        (click)="clear()"
        [attr.aria-label]="clearLabel + ' signature pad'"
        class="absolute end-2 top-2 inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-muted-2 hover:bg-surface-soft"
      >
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        {{ clearLabel }}
      </button>
    </div>
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ liveMsg() }}</div>
  `,
})
export class SignaturePadComponent {
  @ViewChild('svg', { static: true }) svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;

  @Output() signatureChange = new EventEmitter<string>();

  @Input() placeholder = 'Sign here';
  @Input() clearLabel = 'Clear';

  /* Each stroke is a single SVG `points` string ("x,y x,y x,y…"). */
  readonly strokes = signal<string[]>([]);
  readonly isEmpty = signal(true);
  /* Polite aria-live announcement bound to an sr-only region. */
  readonly liveMsg = signal('');
  /* Computed aria-label for the SVG drawing surface so screen-reader users
     know the pad's state without having to interact with it first. */
  readonly padAriaLabel = computed(() =>
    'Signature pad. ' + (this.isEmpty() ? 'Empty.' : 'Signature drawn. Use Clear to start over.'),
  );

  private currentPoints: string[] = [];
  private drawing = false;
  private activePointer: number | null = null;
  /* Tracks whether we've already announced "Signature drawn" since the last
     clear, so screen readers aren't spammed on every stroke. */
  private announcedDrawn = false;

  onPointerDown(event: PointerEvent): void {
    if (this.activePointer !== null) return;
    event.preventDefault();
    this.svgRef.nativeElement.setPointerCapture(event.pointerId);
    this.activePointer = event.pointerId;
    this.drawing = true;
    this.currentPoints = [this.point(event)];
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.drawing || event.pointerId !== this.activePointer) return;
    event.preventDefault();
    this.currentPoints.push(this.point(event));
    /* Live-update the strokes array so the in-progress stroke renders. */
    this.strokes.update((s) => {
      const copy = [...s];
      copy[copy.length] = this.currentPoints.join(' ');
      /* Replace last entry if it's the in-progress one. */
      if (copy.length > 1 && this.currentPoints.length > 1) {
        copy.splice(copy.length - 2, 1);
      }
      return copy;
    });
    if (this.isEmpty()) this.isEmpty.set(false);
  }

  onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) return;
    this.drawing = false;
    this.activePointer = null;
    if (this.currentPoints.length > 1) {
      /* Finalize: replace the live in-progress entry with the committed one. */
      const committed = this.currentPoints.join(' ');
      this.strokes.update((s) => {
        const copy = [...s];
        copy[copy.length - 1] = committed;
        return copy;
      });
    }
    this.currentPoints = [];
    this.emitCurrent();
    /* Announce once on the empty → drawn transition. */
    if (!this.isEmpty() && !this.announcedDrawn) {
      this.announcedDrawn = true;
      this.liveMsg.set('Signature drawn');
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    /* viewBox is fixed so resizing is a no-op for the drawing math. */
  }

  clear(): void {
    this.strokes.set([]);
    this.isEmpty.set(true);
    this.currentPoints = [];
    this.announcedDrawn = false;
    this.liveMsg.set('Signature cleared');
    this.signatureChange.emit('');
  }

  private point(event: PointerEvent): string {
    /* Convert the browser pointer to viewBox coordinates so the saved SVG
       isn't tied to the device's pixel dimensions. */
    const rect = this.svgRef.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 600;
    const y = ((event.clientY - rect.top) / rect.height) * 200;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }

  private emitCurrent(): void {
    if (this.isEmpty()) {
      this.signatureChange.emit('');
      return;
    }
    const polylines = this.strokes()
      .map((points) => `<polyline points="${points}" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">${polylines}</svg>`;
    this.signatureChange.emit(svg);
  }
}
