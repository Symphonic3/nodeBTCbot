const { createDeepWatchedJsonStore } = require("../utils/utils");

const ATH = createDeepWatchedJsonStore("./data/ath.json");

function notifyNewPrice(price) {
  if (price > ATH.ath) {
    ATH.ath = price;
  }
}

/**
 * Gets the bitcoin all-time-high price in USD
 * @returns {number}
 */
function getATH() {
  return ATH.ath;
}

module.exports = { notifyNewPrice, getATH }