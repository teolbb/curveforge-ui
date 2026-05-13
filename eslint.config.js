import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import sonarjs from 'eslint-plugin-sonarjs'
import jsdoc from 'eslint-plugin-jsdoc'

const STRICT_RULES = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/explicit-function-return-type': ['error', {
    allowExpressions: true,
    allowTypedFunctionExpressions: true,
  }],
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

  // Structural metrics — all hard caps. High values signal a function doing too much.
  // - Function length: 50 lines (≤40 is the working norm).
  // - Indent depth: 3 levels. Non-negotiable.
  // - Cyclomatic complexity: 12. Genuine cases (e.g. dispatch over a finite enum)
  //   can use `// eslint-disable-next-line complexity` with a one-line justification.
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true }],
  'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
  'max-depth': ['error', 3],
  'complexity': ['error', 12],

  'no-restricted-syntax': ['error',
    {
      selector: "TSAsExpression > TSTypeReference > Identifier[name='never']",
      message: '`as never` is forbidden. Use proper types or `// eslint-disable-next-line` with a specific reason.',
    },
    {
      selector: 'TSAsExpression > TSAsExpression > TSUnknownKeyword',
      message: '`as unknown as X` double-cast is forbidden. Use proper types or `// eslint-disable-next-line` with a specific reason.',
    },
  ],

  '@typescript-eslint/consistent-type-assertions': ['error', {
    assertionStyle: 'as',
    objectLiteralTypeAssertions: 'never',
  }],
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',

  'no-console': 'error',
  'prefer-const': 'error',

  // Cognitive complexity (sonarjs) — readability metric
  'sonarjs/cognitive-complexity': ['error', 15],

  // Async correctness
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/require-await': 'error',
  '@typescript-eslint/await-thenable': 'error',

  // Boolean correctness — catches `if (someObj)` style bugs
  '@typescript-eslint/strict-boolean-expressions': ['error', {
    allowNullableBoolean: true,
    allowNullableObject: false,
    allowAny: false,
  }],

  // Type-level correctness
  '@typescript-eslint/no-unnecessary-condition': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/no-base-to-string': 'error',
  '@typescript-eslint/no-confusing-void-expression': 'error',

  '@typescript-eslint/only-throw-error': 'error',

  '@typescript-eslint/ban-ts-comment': ['error', {
    'ts-expect-error': 'allow-with-description',
    'ts-ignore': true,
    'ts-nocheck': true,
    'ts-check': false,
  }],

  '@typescript-eslint/consistent-type-imports': ['error', {
    prefer: 'type-imports',
    fixStyle: 'inline-type-imports',
  }],

  'eqeqeq': ['error', 'always', { null: 'ignore' }],

  '@typescript-eslint/prefer-readonly': 'error',

  'max-params': ['error', 4],

  'sonarjs/no-identical-functions': 'error',

  '@typescript-eslint/naming-convention': ['error',
    { selector: 'variableLike', format: ['camelCase', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'allow' },
    { selector: 'typeLike', format: ['PascalCase'] },
    { selector: 'enumMember', format: ['camelCase', 'PascalCase'] },
  ],

  // JSDoc-on-public-exports is required in libraries (so IDE hover docs stay in
  // sync). curveforge-ui is an end-user app, not an SDK consumers integrate
  // against, so this rule is disabled — the rest of the type discipline stands.
  'jsdoc/require-jsdoc': 'off',
  'jsdoc/check-tag-names': ['error', { definedTags: ['internal'] }],
  'jsdoc/check-param-names': 'error',
  'jsdoc/no-undefined-types': 'off',
}

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'scripts/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: ['./tsconfig.json'] },
    },
    plugins: { '@typescript-eslint': tsPlugin, sonarjs, jsdoc },
    rules: STRICT_RULES,
  },
]
