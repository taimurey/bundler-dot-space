/* eslint-disable @typescript-eslint/no-var-requires */
const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'Inter',
                    ...defaultTheme.fontFamily.sans
                ],
  			heliukBrave: [
  				'HeliukBrave',
  				'sans-serif'
  			]
  		},
  		colors: {
  			'custom-green': {
  				'100': '#06d6a0',
  				'200': '#06d6a0',
  				'300': '#06d6a0',
  				'400': '#06d6a0',
  				'500': '#06d6a0',
  				'600': '#06d6a0',
  				'700': '#06d6a0',
  				'800': '#33ff70',
  				'900': '#06d6a0',
  				'1000': '#00ff73'
  			},
  			'jupiter-input-light': '#EBEFF1',
  			'jupiter-bg': '#3A3B43',
  			'jupiter-dark-bg': '#171C20',
  			'jupiter-jungle-green': '#24AE8F',
  			'jupiter-primary': '#FBA43A',
  			'input-boxes': '#202020',
  			warning: '#FAA63C',
  			'v2-primary': 'rgba(199, 242, 132, 1)',
  			'v2-background': '#304256',
  			'v2-background-dark': '#19232D',
  			'v2-lily': '#E8F9FF',
  			'v3-bg': 'rgba(28, 41, 54, 1)',
  			'v3-primary': '#c7f284',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		transitionProperty: {
  			height: 'height',
  			'max-height': 'max-height'
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0.2'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'fade-out': {
  				'0%': {
  					opacity: '1'
  				},
  				'100%': {
  					opacity: '0'
  				}
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in 0.15s ease-in-out',
  			'fade-out': 'fade-out 0.15s ease-out',
  			shine: 'shine 3.5s linear infinite',
  			hue: 'hue 10s infinite linear',
  			typing: 'typing 2s steps(20) infinite alternate, blink .7s infinite'
  		},
  		backgroundImage: {
  			'v2-text-gradient': 'linear-gradient(247.44deg, #C7F284 13.88%, #00BEF0 99.28%)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  variants: {
    extend: {
      height: ["hover"],
      // Enable dark mode, hover, on backgroundImage utilities
      backgroundImage: ["dark", "hover", "focus-within", "focus"],
    },
  },
  plugins: [require("tailwindcss-animate")],
};
