import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  contentChild,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { EmptyState } from '../empty-state/empty-state';

export interface TableColumn<T> {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  custom?: boolean;
  value?: (row: T) => string | number | null | undefined;
}

export interface TablePage {
  page: number;
  size: number;
}

@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, TableModule, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="border-line overflow-hidden rounded-2xl border">
      <p-table
        [value]="rows()"
        [lazy]="lazy()"
        [lazyLoadOnInit]="false"
        [loading]="loading()"
        [paginator]="paginator() && total() > pageSize()"
        [rows]="pageSize()"
        [first]="page() * pageSize()"
        [totalRecords]="total()"
        [rowHover]="true"
        [stripedRows]="true"
        [scrollable]="true"
        [tableStyle]="{ 'min-width': minWidth() }"
        (onLazyLoad)="onLazyLoad($event)"
        (onPage)="
          !lazy() && pageChange.emit({ page: $event.first / $event.rows, size: $event.rows })
        "
      >
        <ng-template #header>
          <tr>
            @for (column of columns(); track column.key) {
              <th
                class="!bg-card-muted !text-ink-muted !text-[0.7rem] !font-bold !tracking-wider uppercase"
                [style.width]="column.width"
                [style.text-align]="column.align ?? 'left'"
              >
                {{ column.label }}
              </th>
            }
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr [class.cursor-pointer]="clickable()" (click)="clickable() && rowClick.emit(row)">
            @for (column of columns(); track column.key) {
              <td class="!text-sm" [style.text-align]="column.align ?? 'left'">
                @if (column.custom && cell()) {
                  <ng-container
                    [ngTemplateOutlet]="cell()!"
                    [ngTemplateOutletContext]="{ $implicit: row, column: column }"
                  />
                } @else {
                  {{ column.value ? column.value(row) : row[column.key] }}
                }
              </td>
            }
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="columns().length">
              <app-empty-state [title]="emptyTitle()" icon="pi pi-inbox" />
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class DataTable<T> {
  readonly rows = input.required<T[]>();
  readonly columns = input.required<TableColumn<T>[]>();
  readonly loading = input(false);
  readonly total = input(0);
  readonly page = input(0);
  readonly pageSize = input(10);
  readonly lazy = input(true);
  readonly paginator = input(true);
  readonly clickable = input(false);
  readonly emptyTitle = input('-');
  readonly minWidth = input('44rem');

  readonly pageChange = output<TablePage>();
  readonly rowClick = output<T>();

  protected readonly cell = contentChild<TemplateRef<unknown>>('cell');

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const size = event.rows ?? this.pageSize();
    this.pageChange.emit({ page: Math.floor((event.first ?? 0) / size), size });
  }
}
