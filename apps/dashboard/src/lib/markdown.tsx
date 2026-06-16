import { Link } from 'react-router-dom';

/** Parse inline **tebal** dan [teks](url) menjadi node React (aman, tanpa HTML). */
function renderInline(text: string, base: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/;
  let rest = text;
  let k = 0;
  while (rest.length) {
    const m = re.exec(rest);
    if (!m) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    if (m[1] != null) {
      nodes.push(
        <strong key={`${base}-b${k++}`} className="font-bold text-ink">
          {m[1]}
        </strong>,
      );
    } else {
      const label = m[2] ?? '';
      const href = m[3] ?? '#';
      const cls = 'text-brand-purple font-semibold hover:opacity-80';
      nodes.push(
        href.startsWith('/') ? (
          <Link key={`${base}-a${k++}`} to={href} className={cls}>
            {label}
          </Link>
        ) : (
          <a key={`${base}-a${k++}`} href={href} className={cls}>
            {label}
          </a>
        ),
      );
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

const BULLET = /^[-•]\s+/;
const ORDERED = /^\d+\.\s+/;

/**
 * Markdown ringan & aman untuk konten halaman publik (dikelola owner):
 * ## / ### heading, - / 1. daftar, ~~~ blok kode, **tebal**, [teks](url).
 */
export function Markdown({ text }: { text: string }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const trimmed = (lines[i] ?? '').trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    // Blok kode ~~~ … ~~~
    if (trimmed.startsWith('~~~')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('~~~')) {
        code.push(lines[i] ?? '');
        i++;
      }
      i++; // lewati penutup
      out.push(
        <pre
          key={k++}
          className="num my-4 overflow-x-auto rounded-xl bg-[#241a3d] px-4 py-3.5 text-[12.5px] leading-relaxed text-slate-200"
        >
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    if (trimmed.startsWith('### ')) {
      out.push(
        <h3 key={k++} className="mt-5 mb-1.5 text-[16px] font-bold text-ink">
          {renderInline(trimmed.slice(4), `h${k}`)}
        </h3>,
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      out.push(
        <h2
          key={k++}
          className="mt-7 mb-2 text-[21px] font-extrabold tracking-tight text-ink"
        >
          {renderInline(trimmed.slice(3), `h${k}`)}
        </h2>,
      );
      i++;
      continue;
    }

    // Daftar tak berurut
    if (BULLET.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && BULLET.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(BULLET, ''));
        i++;
      }
      out.push(
        <ul
          key={k++}
          className="my-3 list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink/80 marker:text-brand-purple"
        >
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, `ul${k}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Daftar berurut
    if (ORDERED.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && ORDERED.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(ORDERED, ''));
        i++;
      }
      out.push(
        <ol
          key={k++}
          className="my-3 list-decimal space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink/80 marker:font-semibold marker:text-brand-purple"
        >
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, `ol${k}-${j}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraf (gabung baris berurutan)
    const para: string[] = [];
    while (i < lines.length) {
      const tl = (lines[i] ?? '').trim();
      if (
        tl === '' ||
        tl.startsWith('~~~') ||
        tl.startsWith('#') ||
        BULLET.test(tl) ||
        ORDERED.test(tl)
      )
        break;
      para.push(tl);
      i++;
    }
    out.push(
      <p key={k++} className="my-3 text-[14.5px] leading-relaxed text-ink/80">
        {renderInline(para.join(' '), `p${k}`)}
      </p>,
    );
  }

  return <>{out}</>;
}
