'use client';

import { Check } from 'lucide-react';
import { AVATARS, AvatarGroup, DEFAULT_AVATAR } from '@/lib/avatars';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';

interface Props {
  avatarId: string;
  onPick: (id: string) => void;
  name: string;
}

function Tile({
  id, label, sub, active, onPick, name,
}: { id: string; label: string; sub?: string; active: boolean; onPick: (id: string) => void; name: string }) {
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      aria-pressed={active}
      title={sub}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
        active ? 'border-primary bg-accent-soft' : 'border-line hover:bg-surface-2'
      }`}
    >
      <Avatar id={id} size={54} name={name} />
      <span className={`text-[11px] font-medium leading-tight ${active ? 'text-primary' : 'text-ink-muted'}`}>
        {label}
      </span>
      {active && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
          <Check size={10} strokeWidth={4} className="text-primary-fg" />
        </span>
      )}
    </button>
  );
}

function Row({ group, avatarId, onPick, name }: { group: AvatarGroup } & Props) {
  return (
    <>
      <div className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {group === 'men' ? 'Men' : 'Women'}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {AVATARS.filter(a => a.group === group).map(a => (
          <Tile
            key={a.id}
            id={a.id}
            label={a.name}
            sub={a.tagline}
            active={avatarId === a.id}
            onPick={onPick}
            name={name}
          />
        ))}
      </div>
    </>
  );
}

/** Avatar picker — ten characters plus the plain initials circle. */
export default function AvatarCard({ avatarId, onPick, name }: Props) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-ink-muted">Your avatar</div>
        {avatarId !== DEFAULT_AVATAR && (
          <button
            onClick={() => onPick(DEFAULT_AVATAR)}
            className="text-[11px] font-semibold text-primary hover:text-primary-hover"
          >
            Reset to default
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Tile
          id={DEFAULT_AVATAR}
          label="Default"
          sub="Just your initial"
          active={avatarId === DEFAULT_AVATAR}
          onPick={onPick}
          name={name}
        />
      </div>

      <Row group="men"   avatarId={avatarId} onPick={onPick} name={name} />
      <Row group="women" avatarId={avatarId} onPick={onPick} name={name} />
    </Card>
  );
}
