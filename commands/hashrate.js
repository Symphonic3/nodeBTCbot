const axios = require("axios");

async function getHashrate() {
  try {
    const api = "https://mempool.space/api/v1/mining/hashrate/current";
    const response = await axios.get(api);
    const currentHashrate = parseFloat(response.data.currentHashrate);
    return currentHashrate;
  } catch {
    throw new Error("Failed to fetch hashrate.");
  }
}

// eslint-disable-next-line no-unused-vars
async function hashrateCommand(message, args) {
  try {
    const rawHashrate = await getHashrate();

    // Convert to EH/s: divide by 1e18
    const networkHashrate = rawHashrate / 1e18;
    const formattedHashrate = networkHashrate.toFixed(2);

    await message.channel.send(`The current network hashrate is ${formattedHashrate} EH/s.`);
  } catch {
    await message.channel.send("Could not fetch hashrate data.");
  }
}

module.exports = {
  hashrate: {
    execute: hashrateCommand,
  },
};
