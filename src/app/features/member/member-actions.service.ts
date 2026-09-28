import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { I18nService } from '../../core/i18n/i18n.service';
import { MemberService } from '../../core/member/member.service';

@Injectable({ providedIn: 'root' })
export class MemberActions {
  private readonly member = inject(MemberService);
  private readonly i18n = inject(I18nService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  signOut(): void {
    this.member.signOut();
    this.messages.add({ severity: 'info', summary: this.i18n.t('member.signedOut') });
    if (this.router.url.startsWith('/member')) {
      this.router.navigateByUrl('/');
    }
  }
}
