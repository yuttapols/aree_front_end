import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { LoadingService } from './core/http/loading.service';
import { I18nService } from './core/i18n/i18n.service';
import { ThemeService } from './core/theme/theme.service';
import { SignOutDialog } from './shared/components/sign-out-dialog/sign-out-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogModule, ToastModule, SignOutDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading.isLoading()) {
      <div
        class="bg-accent animate-loading-bar fixed inset-x-0 top-0 z-[60] h-1 origin-left"
        role="progressbar"
        aria-busy="true"
      ></div>
    }
    <router-outlet />
    <p-toast position="bottom-center" [life]="2600" />
    <p-confirmdialog [style]="{ width: '26rem' }" [breakpoints]="{ '640px': '92vw' }" />
    <app-sign-out-dialog />
  `,
})
export class App {
  protected readonly loading = inject(LoadingService);

  constructor() {
    inject(ThemeService);
    inject(I18nService);
  }
}
