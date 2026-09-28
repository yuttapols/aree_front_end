import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { MemberService } from './member.service';

export const memberOnly: CanActivateFn = () =>
  inject(MemberService).isMember() || inject(Router).createUrlTree(['/login']);

export const guestOnly: CanActivateFn = () =>
  !inject(MemberService).isMember() || inject(Router).createUrlTree(['/member/dashboard']);
