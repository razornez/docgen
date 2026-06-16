/**
 * i18n ringan untuk dashboard (tanpa lib berat). Menyediakan:
 *   <LangProvider> — simpan bahasa (id/en) + persist ke localStorage
 *   useT()         — fungsi terjemah t('key')
 *   useLang()      — { lang, setLang, toggle, fmtNum }
 *
 * Aturan: TIDAK ada string UI hardcoded — semua lewat t(). Kunci dalam Inggris.
 * Halaman menambah kunci di DICT seiring di-revamp (UI-first, bertahap).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'id' | 'en';

const STORAGE_KEY = 'docgen_lang';

type Dict = Record<string, string>;

const ID: Dict = {
  'brand.tagline': 'JSON → PDF · API',
  'group.workspace': 'Workspace',
  'group.developer': 'Developer',

  'nav.overview': 'Ringkasan',
  'nav.wallet': 'Dompet',
  'nav.templates': 'Template',
  'nav.batches': 'Batch',
  'nav.apiKeys': 'API Keys',
  'nav.webhooks': 'Webhooks',
  'nav.admin': 'Admin',

  'sub.overview': 'ringkasan workspace',
  'sub.wallet': 'saldo & transaksi',
  'sub.templates': 'editor template',
  'sub.batches': 'generate massal',
  'sub.apiKeys': 'integrasi server',
  'sub.webhooks': 'notifikasi keluar',
  'sub.admin': 'akun & tim',

  'topbar.search': 'cari template, batch…',
  'topbar.create': 'Buat dokumen',
  'unit.credits': 'kredit',
  'unit.credit': 'kredit',
  'profile.signout': 'Keluar',
  'a11y.openMenu': 'Buka menu',
  'a11y.notifications': 'Notifikasi',
};

const EN: Dict = {
  'brand.tagline': 'JSON → PDF · API',
  'group.workspace': 'Workspace',
  'group.developer': 'Developer',

  'nav.overview': 'Overview',
  'nav.wallet': 'Wallet',
  'nav.templates': 'Templates',
  'nav.batches': 'Batches',
  'nav.apiKeys': 'API Keys',
  'nav.webhooks': 'Webhooks',
  'nav.admin': 'Admin',

  'sub.overview': 'workspace overview',
  'sub.wallet': 'balance & transactions',
  'sub.templates': 'template editor',
  'sub.batches': 'bulk generation',
  'sub.apiKeys': 'server integration',
  'sub.webhooks': 'outbound notifications',
  'sub.admin': 'account & team',

  'topbar.search': 'search template, batch…',
  'topbar.create': 'Create document',
  'unit.credits': 'credits',
  'unit.credit': 'credit',
  'profile.signout': 'Sign out',
  'a11y.openMenu': 'Open menu',
  'a11y.notifications': 'Notifications',
};

const DICT: Record<Lang, Dict> = { id: ID, en: EN };

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string) => string;
  fmtNum: (n: number) => string;
}

const Ctx = createContext<LangCtx | null>(null);

function readInitial(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'id';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitial);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<LangCtx>(() => {
    const t = (key: string): string => DICT[lang][key] ?? DICT.en[key] ?? key;
    const fmtNum = (n: number): string =>
      n.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
    return {
      lang,
      setLang,
      toggle: () => setLang(lang === 'id' ? 'en' : 'id'),
      t,
      fmtNum,
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useLangCtx(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error('useLang/useT harus dipakai di dalam <LangProvider>');
  return ctx;
}

export function useT(): (key: string) => string {
  return useLangCtx().t;
}

export function useLang(): Omit<LangCtx, 't'> {
  const { t: _t, ...rest } = useLangCtx();
  void _t;
  return rest;
}
