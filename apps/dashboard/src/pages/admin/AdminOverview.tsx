import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMe,
  getBatches,
  getTemplates,
  getTeam,
  inviteMember,
  updateMemberRole,
  removeMember,
  type TeamMember,
} from '../../api/client.js';
import { useLang } from '../../i18n/index.js';
import ConfirmModal from '../../components/ConfirmModal.js';

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

const ROLE_CFG: Record<
  string,
  { label: { id: string; en: string }; cls: string }
> = {
  owner: {
    label: { id: 'Pemilik', en: 'Owner' },
    cls: 'bg-indigo-100 text-brand-purple',
  },
  admin: {
    label: { id: 'Admin', en: 'Admin' },
    cls: 'bg-blue-100 text-blue-700',
  },
  member: {
    label: { id: 'Anggota', en: 'Member' },
    cls: 'bg-slate-200/70 text-slate-600',
  },
};

const AVATAR_TINT = [
  'bg-gradient-to-br from-[#9b5de5] to-[#f15bb5]',
  'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]',
  'bg-gradient-to-br from-[#f15bb5] to-[#fca15b]',
  'bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]',
];

function MemberRow({
  m,
  i,
  manage,
  lang,
  onRole,
  onRemove,
}: {
  m: TeamMember;
  i: number;
  manage: boolean;
  lang: 'id' | 'en';
  onRole: (role: 'admin' | 'member') => void;
  onRemove: () => void;
}) {
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const role = ROLE_CFG[m.role] ?? ROLE_CFG.member!;
  const initials = m.name.slice(0, 2).toUpperCase();
  const editable = manage && m.role !== 'owner';
  return (
    <div className="flex items-center gap-3 px-6 py-3.5">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${AVATAR_TINT[i % AVATAR_TINT.length]}`}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-ink truncate">
          {m.name}
        </p>
        <p className="num text-[11px] text-mut truncate">{m.email}</p>
      </div>
      {editable ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={m.role}
            onChange={(e) => onRole(e.target.value as 'admin' | 'member')}
            className="glass-soft rounded-lg px-2 py-1 text-[12px] text-ink focus:outline-none"
          >
            <option value="admin">{t('Admin', 'Admin')}</option>
            <option value="member">{t('Anggota', 'Member')}</option>
          </select>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('Keluarkan anggota', 'Remove member')}
            title={t('Keluarkan', 'Remove')}
            className="w-8 h-8 rounded-lg glass-soft flex items-center justify-center text-mut hover:text-rose-500 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.85}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ) : (
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md flex-shrink-0 ${role.cls}`}
        >
          {role.label[lang]}
        </span>
      )}
    </div>
  );
}

export default function AdminOverview() {
  const qc = useQueryClient();
  const { fmtNum, lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const me = useQuery({ queryKey: ['me'], queryFn: getMe });
  const batches = useQuery({ queryKey: ['batches'], queryFn: getBatches });
  const templates = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });
  const team = useQuery({ queryKey: ['team'], queryFn: getTeam });

  const [manage, setManage] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [iName, setIName] = useState('');
  const [iEmail, setIEmail] = useState('');
  const [iRole, setIRole] = useState<'admin' | 'member'>('member');
  const [iError, setIError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['team'] });

  const invite = useMutation({
    mutationFn: inviteMember,
    onSuccess: () => {
      invalidate();
      setInviteOpen(false);
      setIName('');
      setIEmail('');
      setIRole('member');
      setIError('');
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : '';
      setIError(
        /sudah terdaftar/i.test(msg)
          ? t('Email sudah terdaftar.', 'Email is already registered.')
          : msg || t('Gagal mengundang anggota.', 'Failed to invite member.'),
      );
    },
  });
  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'admin' | 'member' }) =>
      updateMemberRole(id, role),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({
    mutationFn: removeMember,
    onSuccess: invalidate,
  });

  const tenant = me.data?.tenant;
  const tenantName = tenant?.name ?? '…';
  const initials = tenantName.slice(0, 2).toUpperCase();
  const balance = me.data?.wallet.balance ?? 0;
  const docsThisMonth = (batches.data?.data ?? [])
    .filter((b) => isThisMonth(b.created_at))
    .reduce((s, b) => s + b.completed, 0);
  const members = team.data?.data ?? [];
  const joined = tenant?.created_at
    ? new Date(tenant.created_at).toLocaleDateString(
        lang === 'en' ? 'en-US' : 'id-ID',
        {
          month: 'short',
          year: 'numeric',
        },
      )
    : '—';

  const stats = [
    {
      label: t('Dokumen bln ini', 'Docs this month'),
      value: fmtNum(docsThisMonth),
    },
    { label: t('Kredit tersisa', 'Credits remaining'), value: fmtNum(balance) },
    { label: t('Anggota tim', 'Team members'), value: fmtNum(members.length) },
    {
      label: t('Template aktif', 'Active templates'),
      value: fmtNum(templates.data?.data.length ?? 0),
    },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ── Org card + stat strip ───────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="w-12 h-12 rounded-xl bg-grad flex items-center justify-center text-white text-[17px] font-bold flex-shrink-0 shadow-[0_4px_14px_rgba(155,93,229,0.4)]">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-bold text-ink truncate">
              {tenantName}
            </h1>
            <p className="num text-[11.5px] text-mut mt-0.5">
              Prepaid · {tenant?.country ?? '—'} · {t('Bergabung', 'Joined')}{' '}
              {joined}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setManage((v) => !v)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-semibold transition-colors flex-shrink-0 ${
              manage
                ? 'bg-grad text-white shadow-sm'
                : 'glass-soft text-ink hover:bg-white/60'
            }`}
          >
            <svg
              className={`w-4 h-4 ${manage ? 'text-white' : 'text-brand-purple'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.85}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            {manage ? t('Selesai', 'Done') : t('Kelola', 'Manage')}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/40 sm:divide-x divide-white/40">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-4">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut">
                {s.label}
              </p>
              <p className="num mt-1.5 text-[22px] font-extrabold text-ink leading-none">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Team ────────────────────────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
          <h2 className="text-[15px] font-bold text-ink">
            {t('Tim', 'Team')}{' '}
            {manage && (
              <span className="text-[11px] font-semibold text-brand-purple">
                · {t('mode kelola', 'manage mode')}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => {
              setInviteOpen(true);
              setIError('');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full glass-soft text-[12px] font-semibold text-ink hover:bg-white/60 transition-colors"
          >
            <svg
              className="w-4 h-4 text-brand-purple"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.85}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            {t('Undang anggota', 'Invite member')}
          </button>
        </div>
        {members.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-mut">
            {t('Belum ada anggota tim.', 'No team members yet.')}
          </p>
        ) : (
          <div className="divide-y divide-white/40">
            {members.map((m, i) => (
              <MemberRow
                key={m.id}
                m={m}
                i={i}
                manage={manage}
                lang={lang}
                onRole={(role) => roleMut.mutate({ id: m.id, role })}
                onRemove={() => setRemoveTarget(m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Invite modal ────────────────────────────────────────────── */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#2a1c4a]/40 backdrop-blur-sm"
            onClick={() => setInviteOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[420px] glass rounded-[20px] p-6">
            <h3 className="text-[15px] font-bold text-ink">
              {t('Undang anggota', 'Invite member')}
            </h3>
            <p className="text-[12px] text-mut mt-0.5 mb-4">
              {t(
                'Anggota dapat mengakses workspace setelah menerima undangan.',
                'Members can access the workspace after accepting the invitation.',
              )}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIError('');
                if (!iEmail.trim()) {
                  setIError(t('Email wajib diisi.', 'Email is required.'));
                  return;
                }
                invite.mutate({
                  email: iEmail.trim(),
                  name: iName.trim() || undefined,
                  role: iRole,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1.5">
                  {t('Nama', 'Name')}
                </label>
                <input
                  value={iName}
                  onChange={(e) => setIName(e.target.value)}
                  placeholder={t('cth: Andi Wijaya', 'e.g. Andi Wijaya')}
                  className="w-full glass-soft rounded-xl px-3.5 py-2.5 text-[13px] text-ink placeholder:text-mut focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1.5">
                  {t('Email', 'Email')}
                </label>
                <input
                  type="email"
                  value={iEmail}
                  onChange={(e) => setIEmail(e.target.value)}
                  required
                  placeholder="nama@perusahaan.com"
                  className="w-full glass-soft rounded-xl px-3.5 py-2.5 text-[13px] text-ink placeholder:text-mut focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1.5">
                  {t('Peran', 'Role')}
                </label>
                <select
                  value={iRole}
                  onChange={(e) =>
                    setIRole(e.target.value as 'admin' | 'member')
                  }
                  className="w-full glass-soft rounded-xl px-3.5 py-2.5 text-[13px] text-ink focus:outline-none"
                >
                  <option value="member">{t('Anggota', 'Member')}</option>
                  <option value="admin">{t('Admin', 'Admin')}</option>
                </select>
              </div>
              {iError && <p className="text-[12px] text-rose-600">{iError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={invite.isPending}
                  className="px-5 py-2.5 text-[13px] font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.4)] disabled:opacity-50 hover:opacity-90 transition-all"
                >
                  {invite.isPending
                    ? t('Mengundang…', 'Inviting…')
                    : t('Kirim undangan', 'Send invitation')}
                </button>
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="px-5 py-2.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
                >
                  {t('Batal', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={removeTarget !== null}
        title={t('Keluarkan anggota?', 'Remove member?')}
        message={t(
          `${removeTarget?.name ?? 'Anggota'} akan kehilangan akses ke workspace ini.`,
          `${removeTarget?.name ?? 'This member'} will lose access to this workspace.`,
        )}
        confirmLabel={t('Ya, keluarkan', 'Yes, remove')}
        danger
        onConfirm={() => {
          if (removeTarget) removeMut.mutate(removeTarget.id);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
