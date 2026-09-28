import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

import { readStorage, writeStorage } from '../../shared/utils/storage';
import { ErrorCode } from '../api/models/common.model';
import { Lang, LocalizedText } from '../models/menu.model';
import { TRANSLATIONS, TranslationKey } from './translations';

const STORAGE_KEY = 'roti.lang';
const LANGS: readonly Lang[] = ['th', 'en'];
const LOCALES: Record<Lang, string> = { th: 'th-TH', en: 'en-GB' };

export interface BilingualName {
  name: string;
  nameEn?: string | null;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<Lang>(readStorage(STORAGE_KEY, LANGS) ?? 'th');
  readonly locale = computed(() => LOCALES[this.lang()]);

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.document.documentElement.lang = lang;
      writeStorage(STORAGE_KEY, lang);
    });
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const text = TRANSLATIONS[this.lang()][key];
    if (!params) {
      return text;
    }
    return Object.entries(params).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
      text,
    );
  }

  text(value: LocalizedText): string {
    return value[this.lang()];
  }

  pick(th: string, en?: string | null): string {
    return this.lang() === 'en' && en ? en : th;
  }

  name(entity: BilingualName): string {
    return this.pick(entity.name, entity.nameEn);
  }

  error(code: ErrorCode): string {
    return this.t(`error.${code}`);
  }
}
