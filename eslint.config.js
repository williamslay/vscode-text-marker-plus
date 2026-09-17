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
            'no-unused-expressions': 'off',
            'no-redeclare': 'off',
            curly: ['error', 'multi-line'],
            'new-cap': 'off',
            semi: ['error', 'always'],
            quotes: ['error', 'single', {avoidEscape: true}],
            eqeqeq: 'error',
            '@typescript-eslint/no-unused-expressions': 'error',
            '@typescript-eslint/no-redeclare': ['error', {ignoreDeclarationMerge: true}],
            '@typescript-eslint/naming-convention': [
                'error',
                {selector: ['class', 'interface'], format: ['PascalCase']}
            ]
        }
    },
    {
        files: ['src/test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-expressions': 'off'
        }
    }
];
