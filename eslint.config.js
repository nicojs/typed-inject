import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginChaiFriendly from 'eslint-plugin-chai-friendly';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/no-use-before-define': ['off'],
      '@typescript-eslint/no-empty-object-type': ['off'],
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            String: {
              message: 'Use string instead',
              fixWith: 'string',
            },
            Boolean: {
              message: 'Use boolean instead',
              fixWith: 'boolean',
            },
            Number: {
              message: 'Use number instead',
              fixWith: 'number',
            },
            Symbol: {
              message: 'Use symbol instead',
              fixWith: 'symbol',
            },

            // object typing
            Object: {
              message:
                'The `Object` type actually means "any non-nullish value", so it is marginally better than `unknown`.\n- If you want a type meaning "any object", you probably want `Record<string, unknown>` instead.\n- If you want a type meaning "any value", you probably want `unknown` instead.',
            },
            object: {
              message:
                'The `object` type is currently hard to use ([see this issue](https://github.com/microsoft/TypeScript/issues/21732)).\nConsider using `Record<string, unknown>` instead, as it allows you to more easily inspect and use the keys.',
            },
          },
        },
      ],
    },
  },
  {
    plugins: { 'chai-friendly': pluginChaiFriendly },
    files: ['test/**/*.@(ts|js|mts|cts)'],
    rules: {
      'no-unused-expressions': 'off', // disable original rule
      '@typescript-eslint/no-unused-expressions': 'off', // disable original rule
      'chai-friendly/no-unused-expressions': 'error',
    },
  },
  {
    ignores: [
      'testResources/**/*.ts',
      'reports',
      '.nyc_output',
      'dist',
      'eslint.config.js',
    ],
  },
);
