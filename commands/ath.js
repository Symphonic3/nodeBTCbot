const { getATH } = require("../services/ath");
const { formatCurrency } = require("../services/yahoofinance");

// eslint-disable-next-line no-unused-vars
async function ath(message, args) {
  await message.channel.send(`**Bitcoin ATH** is currently **${formatCurrency(getATH(), "USD")}**`);
  return;
}

module.exports = {
  ath: {
    execute: ath
  }
}