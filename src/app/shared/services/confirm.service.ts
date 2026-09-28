import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

import { I18nService } from '../../core/i18n/i18n.service';

export interface ConfirmOptions {
  message: string;
  header?: string;
  acceptLabel?: string;
  danger?: boolean;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly confirmation = inject(ConfirmationService);
  private readonly i18n = inject(I18nService);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmation.confirm({
        message: options.message,
        header: options.header ?? this.i18n.t('common.confirmTitle'),
        icon:
          options.icon ?? (options.danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle'),
        acceptLabel: options.acceptLabel ?? this.i18n.t('common.confirm'),
        rejectLabel: this.i18n.t('common.cancel'),
        acceptButtonProps: { severity: options.danger ? 'danger' : 'primary', rounded: true },
        rejectButtonProps: { severity: 'secondary', outlined: true, rounded: true },
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
