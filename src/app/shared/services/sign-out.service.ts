import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class SignOutService {
  private readonly authService = inject(AuthService);

  readonly open = signal(false);
  readonly busy = signal(false);

  request(): void {
    this.open.set(true);
  }

  cancel(): void {
    if (!this.busy()) {
      this.open.set(false);
    }
  }

  confirm(): void {
    this.busy.set(true);
    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.open.set(false);
        }),
      )
      .subscribe();
  }
}
