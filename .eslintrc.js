module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/eslint-recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'max-len': [
      'error',
      {
        code: 120,
      },
    ],
  },
};
