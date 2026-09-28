import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';

export type AvatarSize = 'normal' | 'large' | 'xlarge';

const THAI_LEADING_VOWELS = /^[เแโใไ]/;

@Component({
  selector: 'app-avatar',
  imports: [AvatarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    @if (url()) {
      <p-avatar [image]="url()!" shape="circle" [size]="size()" styleClass="object-cover" />
    } @else if (initial()) {
      <p-avatar [label]="initial()" shape="circle" [size]="size()" [styleClass]="toneClass()" />
    } @else {
      <p-avatar icon="pi pi-user" shape="circle" [size]="size()" [styleClass]="toneClass()" />
    }
  `,
})
export class Avatar {
  readonly url = input<string | null>(null);
  readonly name = input<string | null>(null);
  readonly size = input<AvatarSize>('normal');
  readonly tone = input<'brand' | 'glass'>('brand');

  protected readonly initial = computed(() => {
    const name = (this.name() ?? '').trim().replace(THAI_LEADING_VOWELS, '');
    return name ? (Array.from(name)[0]?.toUpperCase() ?? '') : '';
  });

  protected readonly toneClass = computed(() =>
    this.tone() === 'glass'
      ? '!bg-white/20 !text-white font-bold'
      : '!bg-brand !text-on-brand font-bold',
  );
}
