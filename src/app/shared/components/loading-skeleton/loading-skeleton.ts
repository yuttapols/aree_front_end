import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

export type SkeletonVariant = 'card' | 'table' | 'list';

@Component({
  selector: 'app-loading-skeleton',
  imports: [SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @switch (variant()) {
      @case ('card') {
        <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          @for (row of rows(); track row) {
            <div class="bg-card shadow-soft rounded-3xl p-3">
              <p-skeleton height="8rem" borderRadius="1rem" />
              <p-skeleton styleClass="mt-3" width="70%" />
              <p-skeleton styleClass="mt-2" width="45%" />
            </div>
          }
        </div>
      }
      @case ('table') {
        <div class="flex flex-col gap-3">
          @for (row of rows(); track row) {
            <div class="flex items-center gap-4">
              <p-skeleton width="3rem" height="1.2rem" />
              <p-skeleton height="1.2rem" />
              <p-skeleton width="6rem" height="1.2rem" />
            </div>
          }
        </div>
      }
      @default {
        <div class="flex flex-col gap-4">
          @for (row of rows(); track row) {
            <div class="flex items-center gap-3">
              <p-skeleton shape="circle" size="2.75rem" />
              <div class="flex-1">
                <p-skeleton width="60%" />
                <p-skeleton styleClass="mt-2" width="35%" />
              </div>
            </div>
          }
        </div>
      }
    }
  `,
})
export class LoadingSkeleton {
  readonly variant = input<SkeletonVariant>('list');
  readonly count = input(4);

  protected readonly rows = computed(() => Array.from({ length: this.count() }, (_v, i) => i));
}
