import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ChipTone = 'soft' | 'brand' | 'accent' | 'dark';

const TONE_CLASS: Record<ChipTone, string> = {
  soft: 'bg-accent-soft text-accent',
  brand: 'bg-brand text-on-brand',
  accent: 'bg-accent text-white',
  dark: 'bg-ink text-canvas',
};

@Component({
  selector: 'app-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      class="rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wide uppercase"
      [class]="toneClass()"
    >
      <ng-content />
    </span>
  `,
})
export class Chip {
  readonly tone = input<ChipTone>('soft');

  protected readonly toneClass = computed(() => TONE_CLASS[this.tone()]);
}
