import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';

import { CartService } from '../../core/cart/cart.service';
import { CartPanel } from '../../features/cart/cart-panel';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, DrawerModule, Navbar, CartPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <main class="min-h-[calc(100dvh-72px)]">
      <router-outlet />
    </main>
    <p-drawer
      [visible]="cart.drawerOpen()"
      (visibleChange)="cart.drawerOpen.set($event)"
      position="right"
      [showCloseIcon]="true"
      styleClass="!w-full sm:!w-[26rem]"
    >
      <app-cart-panel />
    </p-drawer>
  `,
})
export class PublicLayout {
  protected readonly cart = inject(CartService);
}
