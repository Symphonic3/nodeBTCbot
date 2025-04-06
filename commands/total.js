const axios = require('axios');

// eslint-disable-next-line no-unused-vars
async function totalCommand(message, args) {
  const api = "https://blockchain.info/q/totalbc";
  try {
    const response = await axios.get(api);
    const totalCoins = parseInt(response.data) / 100000000;
    const percentMined = totalCoins / 21000000 * 100;
    
    const formattedTotalCoins = totalCoins.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const formattedPercentMined = percentMined.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
    const formattedRemaining = (100 - percentMined).toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
    
    const messageString = `There are ${formattedTotalCoins} BTC in circulation. ${formattedPercentMined}% of all bitcoin have been mined. Only ${formattedRemaining}% remain to be mined.`;
    await message.channel.send(messageString);
  } catch {
    await message.channel.send("Error fetching total BTC in circulation.");
  }
}

module.exports = {
  total: {
    execute: totalCommand
  }
};
