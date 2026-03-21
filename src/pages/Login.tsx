import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Server, Eye, EyeOff, LogIn, UserPlus, Loader2, Sun, Moon } from "lucide-react";

type Mode = "login" | "register";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-xl transition-all z-10"
        style={{ background: 'var(--color-toggle-bg)', color: 'var(--color-fg-muted)' }}
        title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10" style={{ background: 'var(--color-primary)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-3xl opacity-10" style={{ background: 'var(--color-accent)' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
            }}
          >
            <Server className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-fg)' }}>
            Leandro Severo
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>Painel de Controle</p>
        </div>

        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--color-bg-secondary)' }}>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200"
              style={mode === "login"
                ? { background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }
                : { color: 'var(--color-fg-muted)', background: 'transparent' }}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
              className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200"
              style={mode === "register"
                ? { background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }
                : { color: 'var(--color-fg-muted)', background: 'transparent' }}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg)' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all"
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-fg)',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg)' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none transition-all"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-fg)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-sm" style={{ color: 'var(--color-success)' }}>{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-fg-muted)' }}>
          app.leandrosevero.com.br
        </p>
      </div>
    </div>
  );
}
