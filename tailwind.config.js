/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--color-bg)',
          'bg-secondary': 'var(--color-bg-secondary)',
          fg: 'var(--color-fg)',
          'fg-muted': 'var(--color-fg-muted)',
          border: 'var(--color-border)',
          border2: 'var(--color-border2)',
          primary: 'var(--color-primary)',
          'primary-hover': 'var(--color-primary-hover)',
          'primary-fg': 'var(--color-primary-fg)',
          accent: 'var(--color-accent)',
          card: 'var(--color-card)',
          glass: 'var(--color-glass)',
          glass2: 'var(--color-glass2)',
          glass3: 'var(--color-glass3)',
          success: 'var(--color-success)',
          'sidebar-bg': 'var(--color-sidebar-bg)',
          'sidebar-border': 'var(--color-sidebar-border)',
          'toggle-bg': 'var(--color-toggle-bg)',
        },
      },
    },
  },
  plugins: [],
};
