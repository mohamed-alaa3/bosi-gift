/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        // Brand colors (from logo)
        brand: {
          primary: '#F58220',
          'primary-hover': '#E0700E',
          'primary-soft': '#FFF4E8',
          ink: '#2E2E2E',
          'ink-soft': '#4A4A4A',
        },
        // Semantic — point to CSS variables so dark mode works automatically
        bg: 'var(--bg)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-muted': 'var(--bg-muted)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        // Status
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)',
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        pill: '9999px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'brand-sm': '0 4px 12px rgba(245, 130, 32, 0.15)',
        'brand-md': '0 8px 24px rgba(245, 130, 32, 0.20)',
      },
      transitionTimingFunction: {
        'motion-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'motion-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
        slower: '600ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-up-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down-in': {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-start': {
          from: { transform: 'translateX(var(--motion-dir-start, -100%))' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-end': {
          from: { transform: 'translateX(var(--motion-dir-end, 100%))' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--motion-duration-base) var(--motion-ease-out) both',
        'fade-out': 'fade-out var(--motion-duration-base) var(--motion-ease-in-out) both',
        'slide-up': 'slide-up-in var(--motion-duration-slow) var(--motion-ease-out) both',
        'slide-down': 'slide-down-in var(--motion-duration-slow) var(--motion-ease-out) both',
        'scale-in': 'scale-in var(--motion-duration-base) var(--motion-ease-out) both',
        'slide-in-start': 'slide-in-start var(--motion-duration-slow) var(--motion-ease-out) both',
        'slide-in-end': 'slide-in-end var(--motion-duration-slow) var(--motion-ease-out) both',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};