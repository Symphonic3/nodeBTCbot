const { createSavable } = require("../utils/utils");

const ATH = createSavable("./data/ath.json");

function notifyNewPrice(price) {
  if (price > ATH.ath) {
    ATH.ath = price;
    ATH.save();
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