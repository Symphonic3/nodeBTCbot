const { createDeepWatchedJsonStore } = require('../utils/utils.js');

const ITEM_DICT = createDeepWatchedJsonStore('./data/itemdict.json');

/**
 * Adds or edits an item.
 * @param {string} code - The unique calling code (3-4 characters).
 * @param {string} name - The full name of the item.
 * @param {number|string} price - The item's price in USD.
 * @param {"add"|"edit"} mode - Whether to add or edit the item.
 * @param {string} lastEditedBy - Name of the editor.
 * @param {string} [emoji] - Optional emoji keyword (no colons).
 * @param {string} [pricingType] - Optional pricing type ("single").
 * @returns {string} Result message, either success or an error.
 */
function saveItem(code, name, price, mode, lastEditedBy, emoji = "", pricingType = "") {
  if (!["add", "edit"].includes(mode)) {
    return "Invalid mode. Use 'add' or 'edit'.";
  }
  if (!code || code.length < 3 || code.length > 4) {
    return "Please use a calling code that is 3-4 characters.";
  }

  const cost = parseFloat(price);
  if (isNaN(cost)) {
    return "The price must be a decimal number representing USD value of the item.";
  }

  const itemExists = Object.prototype.hasOwnProperty.call(ITEM_DICT, code.toLowerCase());
  if (mode === "add" && itemExists) {
    return `The calling code ${code} already exists. Use edit mode or a different code.`;
  }
  if (mode === "edit" && !itemExists) {
    return `The calling code ${code} doesn't exist. Use add mode or an existing code.`;
  }

  const single = pricingType === "single";

  const paramsToCheck = [code, name, String(price), emoji, pricingType, lastEditedBy];
  for (const param of paramsToCheck) {
    if (param && param.length > 50) {
      return "Please keep parameters below 50 characters each.";
    }
  }

  ITEM_DICT[code.toLowerCase()] = {
    cost,
    name,
    emoji: emoji ? `:${emoji}:` : "",
    single,
    last_edited_by: lastEditedBy,
  };

  return {
    success: `Successfully ${mode === "add" ? "added" : "edited"} item: ${name} with value $${cost}`,
  };
}

/**
 * Edits the price of an existing item.
 * @param {string} code - The calling code of the item.
 * @param {number|string} price - The new price in USD.
 * @returns {string} Result message, either success or an error.
 */
function editItemPrice(code, price) {
  // Validate calling code.
  if (!code || !Object.prototype.hasOwnProperty.call(ITEM_DICT, code.toLowerCase())) {
    return `The calling code ${code} doesn't exist. Either add the item or choose an existing calling code.`;
  }

  // Validate price.
  const cost = parseFloat(price);
  if (isNaN(cost)) {
    return "The price must be a decimal number representing USD value of the item.";
  }

  // Update the price.
  ITEM_DICT[code.toLowerCase()].cost = cost;
  return `Successfully updated item: ${ITEM_DICT[code.toLowerCase()].name} with value $${cost}`;
}

/**
 * Returns the price in USD of an existing item.
 * @param {string} code - The calling code of the item.
 * @returns {number} The price
 */
function getItemPrice(code) {
  // Validate calling code.
  if (!code || !Object.prototype.hasOwnProperty.call(ITEM_DICT, code.toLowerCase())) {
    return NaN;
  }

  return ITEM_DICT[code.toLowerCase()].cost;
}

/**
 * Returns if an item should be formatted as single
 * @param {string} code - The calling code of the item.
 * @returns {boolean}
 */
function isSingleItem(code) {
  return ITEM_DICT[code.toLowerCase()]?.single;
}

/**
 * Formats an amount of an item  as a nice string
 * @param {number} amount 
 * @param {string} code 
 * @returns {string}
 */
function formatItem(amount, code) {
  // Validate calling code.
  if (!code || !Object.prototype.hasOwnProperty.call(ITEM_DICT, code.toLowerCase())) {
    return "";
  }

  const item = ITEM_DICT[code.toLowerCase()];
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${item.name} ${item.emoji}`;
}

/**
 * @returns {string[]}
 */
function getAllItems() {
  return Object.keys(ITEM_DICT);
}

module.exports = { saveItem, editItemPrice, getItemPrice, isSingleItem, formatItem, getAllItems }