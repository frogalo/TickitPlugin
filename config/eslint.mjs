import globals from 'globals'
import eslint from '@eslint/js'

export default [
	{ ignores: ['.robo/', 'tickitconfig/'] },
	{
		files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	},
	eslint.configs.recommended
]
