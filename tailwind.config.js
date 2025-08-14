/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))', // MeelFul primary #6c8bac
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))', // MeelFul secondary #b9ced4
					foreground: 'hsl(var(--secondary-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))', // MeelFul accent #ff9040
					foreground: 'hsl(var(--accent-foreground))',
				},
				// MeelFul Brand Colors
				'meelful-primary': '#6c8bac', // 主色：按鈕、鏈接、標題
				'meelful-secondary': '#b9ced4', // 輔助色：次級元素、邊框
				'meelful-accent': '#ff9040', // 強調色：CTA 按鈕、提示
				'meelful-neutral': '#bcbcd4', // 中性色：文字、細節
				'meelful-background': '#b8c8e0', // 背景色：主體背景
				// Legacy compatibility (can be removed later)
				'vape-purple': '#6c8bac', // mapped to primary
				'vape-cyan': '#b9ced4', // mapped to secondary
				'vape-pink': '#ff9040', // mapped to accent
				'vape-green': '#bcbcd4', // mapped to neutral
				'vape-dark': '#2a3441', // darker version of primary
				'vape-darker': '#1a2229', // even darker
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			fontFamily: {
				'sans': ['Inter', 'Noto Sans TC', 'system-ui', 'sans-serif'],
				'display': ['Inter', 'Noto Sans TC', 'system-ui', 'sans-serif'],
				'body': ['Inter', 'Noto Sans TC', 'system-ui', 'sans-serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}