import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';

import { ApiException } from '../../../core/api/models/common.model';
import { CustomerResponse } from '../../../core/api/models/user.model';
import { UserApi } from '../../../core/api/services/user.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { requiredText, thaiPhone, validationMessage } from '../../utils/validators';
import { FormField } from '../form-field/form-field';
import { PhoneInput } from '../phone-input/phone-input';

@Component({
  selector: 'app-quick-register-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    FormField,
    PhoneInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('memberLookup.quickRegister')"
      [breakpoints]="{ '640px': '94vw' }"
      [style]="{ width: '26rem' }"
    >
      @if (password(); as temporary) {
        <div class="flex flex-col items-center gap-2 py-2 text-center">
          <span class="grid h-12 w-12 place-items-center rounded-full bg-[#4a7c4e] text-white">
            <i class="pi pi-check"></i>
          </span>
          <p class="text-ink font-semibold">{{ i18n.t('quickRegister.done') }}</p>
          <p class="text-ink-muted text-sm">{{ i18n.t('quickRegister.tempPassword') }}</p>
          <p class="font-display bg-canvas rounded-xl px-4 py-2 text-2xl font-bold tracking-widest">
            {{ temporary }}
          </p>
        </div>
      } @else {
        <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-form-field
            inputId="qr-nickname"
            [label]="i18n.t('quickRegister.nickname')"
            [error]="errorFor('nickname')"
          >
            <input
              pInputText
              id="qr-nickname"
              formControlName="nickname"
              class="rounded-xl"
              [fluid]="true"
              [invalid]="!!errorFor('nickname')"
            />
          </app-form-field>
          <app-form-field
            inputId="qr-phone"
            [label]="i18n.t('register.phone')"
            [error]="errorFor('phone')"
          >
            <app-phone-input
              inputId="qr-phone"
              formControlName="phone"
              [invalid]="!!errorFor('phone')"
            />
          </app-form-field>
          <p-button
            type="submit"
            [label]="i18n.t('quickRegister.submit')"
            icon="pi pi-user-plus"
            [rounded]="true"
            [fluid]="true"
            [loading]="saving()"
          />
        </form>
      }
    </p-dialog>
  `,
})
export class QuickRegisterDialog {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(UserApi);

  readonly visible = model(false);
  readonly initialPhone = input('');
  readonly registered = output<CustomerResponse>();

  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly password = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nickname: ['', [requiredText]],
    phone: ['', [Validators.required, thaiPhone]],
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.password.set(null);
        this.submitted.set(false);
        this.form.reset({ nickname: '', phone: this.initialPhone().replace(/\D/g, '') });
      }
    });
  }

  protected errorFor(field: 'nickname' | 'phone'): string | null {
    const control = this.form.controls[field];
    return control.touched || this.submitted() ? validationMessage(control, this.i18n) : null;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .quickRegister({ nickname: value.nickname.trim(), phone: value.phone })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.password.set(response.temporaryPassword);
          this.registered.emit(response.customer);
        },
        error: (error: ApiException) =>
          this.form.controls.phone.setErrors({ server: this.i18n.error(error.code) }),
      });
  }
}
