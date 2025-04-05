function cachifyFunction(fn, timeoutMs) {
  const cache = new Map();

  return async function (...args) {
    const key = JSON.stringify(args); // simple arg hash
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expireAt) {
      return cached.value;
    }

    const result = await fn(...args);
    cache.set(key, {
      value: result,
      expireAt: Date.now() + timeoutMs,
    });

    return result;
  };
}

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

module.exports = { cachifyFunction, formatCurrency };