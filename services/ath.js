const { save, load } = require("../utils/utils");

const FILEPATH = "./data/ath.json";
const ATH = load(FILEPATH);

function notifyNewPrice(price) {
  if (price > ATH.ath) {
    ATH.ath = price;
    save(ATH, FILEPATH);
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