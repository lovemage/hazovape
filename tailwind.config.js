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
					DEFAULT: '#8B5CF6', // 電子紫
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: '#06B6D4', // 電子青
					foreground: 'hsl(var(--secondary-foreground))',
				},
				accent: {
					DEFAULT: '#F471B5', // 霓虹粉
					foreground: 'hsl(var(--accent-foreground))',
				},
				'vape-purple': '#8B5CF6',
				'vape-cyan': '#06B6D4',
				'vape-pink': '#F471B5',
				'vape-green': '#10B981',
				'vape-dark': '#0F172A',
				'vape-darker': '#020617',
				// 復古風格配色
				'vintage-green': '#5F796A',
				'vintage-brown': '#9B8D78',
				'vintage-pink': '#F4D6D6',
				'vintage-gray': '#4F4F4F',
				'vintage-light': '#EFEFEF',
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