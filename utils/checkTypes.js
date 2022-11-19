const ifTypeError = function typeError(condition, message) {
  if (!condition && message) {
    throw new TypeError(message);
  }
  return condition;
};

const checkType = function checkType(type, value, message) {
  // eslint-disable-next-line valid-typeof
  return ifTypeError(typeof value === type, message);
};

const checkInteger = function checkInteger(value, message) {
  return ifTypeError(Number.isInteger(value), message);
};

const checkObject = function checkObject(value, message) {
  return ifTypeError(value && typeof value === 'object', message);
};

module.exports = {
  boolean: checkType.bind(this, 'boolean'),
  function: checkType.bind(this, 'function'),
  integer: checkInteger,
  object: checkObject,
  string: checkType.bind(this, 'string'),
};
