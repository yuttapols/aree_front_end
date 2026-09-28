import { computed, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';

import { PageResponse } from '../../core/api/models/common.model';

export interface CrudQuery {
  page: number;
  size: number;
  keyword: string;
}

export interface CrudStoreConfig<T, Q extends CrudQuery> {
  initialQuery: Q;
  load: (query: Q) => Observable<PageResponse<T> | T[]>;
  save?: (item: Partial<T>, id: number | null) => Observable<T>;
  remove?: (id: number) => Observable<void>;
}

export function createCrudStore<T, Q extends CrudQuery = CrudQuery>(config: CrudStoreConfig<T, Q>) {
  const items = signal<T[]>([]);
  const total = signal(0);
  const loading = signal(false);
  const saving = signal(false);
  const query = signal<Q>(config.initialQuery);

  function load(patch: Partial<Q> = {}): void {
    query.update((current) => ({ ...current, ...patch }));
    loading.set(true);
    config
      .load(query())
      .pipe(finalize(() => loading.set(false)))
      .subscribe((response) => {
        if (Array.isArray(response)) {
          items.set(response);
          total.set(response.length);
        } else {
          items.set(response.items);
          total.set(response.totalItems);
        }
      });
  }

  function save(item: Partial<T>, id: number | null): Observable<T> {
    if (!config.save) {
      throw new Error('save not configured');
    }
    saving.set(true);
    return config.save(item, id).pipe(finalize(() => saving.set(false)));
  }

  function remove(id: number): Observable<void> {
    if (!config.remove) {
      throw new Error('remove not configured');
    }
    return config.remove(id);
  }

  return {
    items: items.asReadonly(),
    total: total.asReadonly(),
    loading: loading.asReadonly(),
    saving: saving.asReadonly(),
    query: query.asReadonly(),
    isEmpty: computed(() => !loading() && items().length === 0),
    load,
    reload: () => load(),
    save,
    remove,
  };
}

export type CrudStore<T, Q extends CrudQuery = CrudQuery> = ReturnType<
  typeof createCrudStore<T, Q>
>;
