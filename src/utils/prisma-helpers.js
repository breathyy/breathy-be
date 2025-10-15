const hasToNumber = (value) => Boolean(value) && typeof value.toNumber === 'function';

const toNullableNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (hasToNumber(value)) {
    return value.toNumber();
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
};

const toNullableDecimal = (value, fractionDigits = 2) => {
  const numeric = toNullableNumber(value);
  if (numeric === null) {
    return null;
  }
  if (typeof fractionDigits !== 'number' || fractionDigits < 0) {
    return numeric;
  }
  const factor = 10 ** fractionDigits;
  return Math.round(numeric * factor) / factor;
};

const toBigIntOrNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Cannot convert non-finite number to BigInt');
    }
    return BigInt(Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return BigInt(value.trim());
  }
  throw new Error('Unsupported value for BigInt conversion');
};

module.exports = {
  toNullableNumber,
  toNullableDecimal,
  toBigIntOrNull
};
