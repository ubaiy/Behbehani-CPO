import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Drawn-signature pad — uses pointer events (not mouse-only) so it works for
 * stylus and finger on tablets (per feedback_inspection_ux memory).
 *
 * Emits the drawn signature as an SVG `<path d="…">` string on every stroke
 * end. Parent uses the latest emitted value when finalizing sign-off.
 *
 * The canvas is purely a visual; persistence is in the emitted SVG path
 * which is small (< 50 KB cap matches the schema constraint).
 */
@Component({
  selector: 'admin-signature-pad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      #wrapper
      class="relative w-full rounded-md border-2 border-dashed border-slate-300 bg-slate-50/40 overflow-hidden touch-none"
      [style.height.px]="heightPx"
    >
      <canvas
        #canvas
        class="absolute inset-0 w-full h-full"
        [width]="widthPx"
        [height]="heightPx"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
        (pointerleave)="onPointerUp($event)"
        aria-label="Signature canvas — draw with finger or stylus"
        role="img"
      ></canvas>
      @if (isEmpty) {
        <p class="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
          Sign here
        </p>
      }
      <button
        type="button"
        class="absolute top-2 right-2 text-xs text-slate-600 bg-white rounded px-3 py-1.5 border border-slate-200 hover:text-red-600 min-h-[44px] min-w-[44px]"
        (click)="clear()"
        [disabled]="disabled"
      >Clear</button>
    </div>
  `,
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrapper', { static: true }) wrapperRef!: ElementRef<HTMLDivElement>;

  @Input() widthPx = 600;
  @Input() heightPx = 128;
  @Input() disabled = false;

  /** Emits an `<svg>...</svg>` string (full SVG with viewBox) on every change. */
  @Output() signatureChange = new EventEmitter<string>();

  protected isEmpty = true;

  /** All drawn strokes as arrays of points. */
  private strokes: { x: number; y: number }[][] = [];
  /** Current in-progress stroke (null when not drawing). */
  private currentStroke: { x: number; y: number }[] | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    if (this.ctx) {
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 2.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
  }

  ngOnDestroy(): void {
    this.strokes = [];
    this.currentStroke = null;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.redraw();
  }

  protected onPointerDown(ev: PointerEvent): void {
    if (this.disabled) return;
    ev.preventDefault();
    (ev.target as HTMLCanvasElement).setPointerCapture?.(ev.pointerId);
    const point = this.toCanvasPoint(ev);
    this.currentStroke = [point];
    this.isEmpty = false;
  }

  protected onPointerMove(ev: PointerEvent): void {
    if (this.disabled || !this.currentStroke || !this.ctx) return;
    ev.preventDefault();
    const point = this.toCanvasPoint(ev);
    const last = this.currentStroke[this.currentStroke.length - 1];
    this.currentStroke.push(point);
    this.ctx.beginPath();
    this.ctx.moveTo(last.x, last.y);
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
  }

  protected onPointerUp(ev: PointerEvent): void {
    if (this.disabled || !this.currentStroke) return;
    ev.preventDefault();
    if (this.currentStroke.length > 0) {
      this.strokes.push(this.currentStroke);
      this.emitSignature();
    }
    this.currentStroke = null;
  }

  clear(): void {
    this.strokes = [];
    this.currentStroke = null;
    this.isEmpty = true;
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }
    this.signatureChange.emit('');
  }

  /** Convert a pointer event into canvas-local coordinates. */
  private toCanvasPoint(ev: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (ev.clientX - rect.left) * scaleX,
      y: (ev.clientY - rect.top) * scaleY,
    };
  }

  private redraw(): void {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        this.ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      this.ctx.stroke();
    }
  }

  private emitSignature(): void {
    if (this.strokes.length === 0) {
      this.signatureChange.emit('');
      return;
    }
    const paths = this.strokes
      .filter((s) => s.length > 0)
      .map((s) => {
        const [first, ...rest] = s;
        const moveTo = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
        const lines = rest.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        return `${moveTo} ${lines}`.trim();
      })
      .join(' ');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.widthPx} ${this.heightPx}">` +
      `<path d="${paths}" fill="none" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>`;
    this.signatureChange.emit(svg);
  }
}
