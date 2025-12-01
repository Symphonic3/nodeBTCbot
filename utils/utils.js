const fs = require('fs');

/**
 * Wraps a function in a caching wrapper that returns the previous result
 * if the function is called with the same parameters before the timeout expires.
 * 
 * This will independently cache function calls with different arguments; don't use it
 * if the function is complex and often takes unique arguments.
 * @param {function} fn - The function to wrap
 * @param {number} timeoutMs - The cache timeout
 * @returns 
 */
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

/**
 * Creates an object from a json file which can be written to disk by invoking save().
 * 
 * @param {string} filePath - The json file containing the object, path starts from project root
 * @returns {Object}
 */
function createSavable(filePath) {
  // Ensure the file exists
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}');
  }

  let data;

  // Load data
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    data = {};
  }

  const save = () => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), err => {
      if (err) console.error('Failed to save JSON:', err);
    });
  };
  data.save = save;

  return data;
}

module.exports = { cachifyFunction, createSavable };