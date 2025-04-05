const fs = require('fs');

/**
 * Wraps a function in a caching wrapper that returns the previous result
 * if the function is called with the same parameters before the timeout expires.
 * 
 * This will independently cache function calls with different arguments; don't use it
 * if the function is complex and often takes unique arguments.
 * @param {function} fn - The function to wrap
 * @param {*} timeoutMs - The cache timeout
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
 * Creates a deeply watched object from a json file, 
 * which will automatically write to disk when the object is updated.
 * 
 * Don't use this if the object will be updated quickly or frequently.
 * @param {string} filePath - The json file containing the object
 * @returns {Object}
 */
function createDeepWatchedJsonStore(filePath) {
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

  const wrap = (target) => {
    if (typeof target !== 'object' || target === null) return target;

    return new Proxy(target, {
      get(obj, prop) {
        const value = obj[prop];
        // Recursively wrap nested objects
        if (typeof value === 'object' && value !== null) {
          return wrap(value);
        }
        return value;
      },
      set(obj, prop, value) {
        obj[prop] = value;
        save();
        return true;
      },
      deleteProperty(obj, prop) {
        delete obj[prop];
        save();
        return true;
      }
    });
  };

  return wrap(data);
}

module.exports = { cachifyFunction, createDeepWatchedJsonStore };