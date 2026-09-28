import { Injectable, effect, signal } from '@angular/core';

import { readJson, writeJson } from '../../shared/utils/storage';

const STORAGE_KEY = 'roti.favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly ids = signal<ReadonlySet<string>>(this.load());

  constructor() {
    effect(() => writeJson(STORAGE_KEY, [...this.ids()]));
  }

  has(id: string): boolean {
    return this.ids().has(id);
  }

  toggle(id: string): void {
    this.ids.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  private load(): ReadonlySet<string> {
    const stored = readJson(STORAGE_KEY);
    return new Set(
      Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [],
    );
  }
}
