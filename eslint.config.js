const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');

module.exports = [
    {
        ignores: ['node_modules/**', 'out/**', 'coverage/**', '.vscode-test/**']
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': typescriptEslint
        },
        rules: {
            'no-throw-literal': 'error',
            'no-unused-expressions': 'error',
            'no-redeclare': 'error',
            curly: ['error', 'multi-line'],
            'new-cap': 'off',
            semi: ['error', 'always'],
            quotes: ['error', 'single', {avoidEscape: true}],
            eqeqeq: 'error',
            '@typescript-eslint/naming-convention': [
                'error',
                {selector: 'class', format: ['PascalCase']}
            ]
        }
    },
    {
        files: ['src/test/**/*.ts'],
        rules: {
            'no-unused-expressions': 'off'
        }
    }
];
