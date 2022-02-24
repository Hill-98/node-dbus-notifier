module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  extends: 'airbnb-base',
  parserOptions: {
    ecmaVersion: 2022,
  },
  rules: {
    'max-len': [
      'error',
      {
        code: 120,
      },
    ],
  }
};
