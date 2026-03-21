import { X, CircleUser as UserCircle } from "lucide-react";

interface ProfileIncompletePopupProps {
  completion: number;
  onClose: () => void;
  onGoToProfile: () => void;
}

export default function ProfileIncompletePopup({ completion, onClose, onGoToProfile }: ProfileIncompletePopupProps) {
  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-72 rounded-2xl shadow-2xl animate-in"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
              }}
            >
              <UserCircle className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>Perfil incompleto</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{completion}% preenchido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg flex-shrink-0 transition-colors"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completion}%`, background: 'var(--color-primary)' }}
          />
        </div>

        <p className="text-xs mt-2.5" style={{ color: 'var(--color-fg-muted)' }}>
          Complete seu perfil com nome, telefone e descrição.
        </p>

        <button
          onClick={onGoToProfile}
          className="mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
        >
          Completar perfil
        </button>
      </div>
    </div>
  );
}
