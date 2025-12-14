import eslint from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default [
    {
        ignores: ['node_modules', 'cdk.out'],
    },
    {
        // This is needed to avoid linting errors in unused files
        ignores: ['src/common/ts/runtime/lambda-client.ts'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: { project: './tsconfig.json' },
        },

        rules: {
            indent: ['error', 4, {
                SwitchCase: 1,
            }],

            quotes: ['error', 'single'],
        },
    },
    {
        plugins: {
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
        },
    },
];
