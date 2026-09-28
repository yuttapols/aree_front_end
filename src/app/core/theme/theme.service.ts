import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

import { readStorage, writeStorage } from '../../shared/utils/storage';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'roti.theme';
const MODES: readonly ThemeMode[] = ['light', 'dark'];
const DARK_CLASS = 'app-dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly mode = signal<ThemeMode>(readStorage(STORAGE_KEY, MODES) ?? this.systemMode());
  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    effect(() => {
      const mode = this.mode();
      this.document.documentElement.classList.toggle(DARK_CLASS, mode === 'dark');
      writeStorage(STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  private systemMode(): ThemeMode {
    return this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
}
