import { describe, expect, it } from 'vitest';
import { renderHtml, TemplateRenderError } from '../src/index.js';

describe('renderHtml — mesin polos (docs/00)', () => {
  it('mengisi variabel apa adanya', () => {
    expect(renderHtml('Halo {{name}}', { name: 'Sam' })).toBe('Halo Sam');
  });

  it('mengisi nilai bersarang (obj.prop)', () => {
    expect(
      renderHtml('{{customer.name}}', { customer: { name: 'Acme' } }),
    ).toBe('Acme');
  });

  it('membiarkan kosong bila variabel tidak dikirim (non-strict)', () => {
    expect(renderHtml('[{{missing}}]', {})).toBe('[]');
  });

  it('tidak menghitung/memformat — angka tampil apa adanya', () => {
    expect(renderHtml('{{total}}', { total: 77700000 })).toBe('77700000');
  });

  it('mengulang daftar dengan {{#each}}', () => {
    const out = renderHtml('{{#each items}}<li>{{description}}</li>{{/each}}', {
      items: [{ description: 'A' }, { description: 'B' }],
    });
    expect(out).toBe('<li>A</li><li>B</li>');
  });

  it('seksi kondisional {{#if}}', () => {
    const tpl = '{{#if npwp}}NPWP {{npwp}}{{/if}}';
    expect(renderHtml(tpl, { npwp: '123' })).toBe('NPWP 123');
    expect(renderHtml(tpl, {})).toBe('');
  });

  it('meng-escape HTML pada {{ }} (keamanan), mentah pada {{{ }}}', () => {
    const data = { x: '<b>&</b>' };
    expect(renderHtml('{{x}}', data)).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
    expect(renderHtml('{{{x}}}', data)).toBe('<b>&</b>');
  });

  it('menolak helper kustom (format/hitung) — TemplateRenderError', () => {
    // `rupiah`/`inc` adalah helper format/hitung yang sengaja TIDAK disediakan.
    expect(() => renderHtml('{{rupiah total}}', { total: 1000 })).toThrow(
      TemplateRenderError,
    );
  });

  it('menolak sintaks template yang rusak — TemplateRenderError', () => {
    expect(() => renderHtml('{{#if x}}belum ditutup', {})).toThrow(
      TemplateRenderError,
    );
  });
});
