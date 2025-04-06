const axios = require("axios");

// Formats BTC with up to 8 decimals, trimming trailing zeros
function floatFormatBtc(value) {
  return parseFloat(value.toFixed(8)).toString();
}

async function rewardCommand(message, args) {
  if (args.length === 0) {
    await message.channel.send("Please specify the number of blocks to average over.");
    return;
  }

  const blockCount = parseInt(args[0], 10);
  if (isNaN(blockCount)) {
    await message.channel.send("An integer block count must be specified.");
    return;
  }

  if (blockCount < 1) {
    await message.channel.send("Block count must be at least 1.");
    return;
  }

  const api = `https://mempool.space/api/v1/mining/reward-stats/${blockCount}`;
  try {
    const response = await axios.get(api);
    const data = response.data;

    const averageReward = (parseFloat(data.totalReward) / blockCount) / 100000000;
    const formatted = floatFormatBtc(averageReward);

    await message.channel.send(`The average block reward over the last ${blockCount} blocks is ${formatted} BTC.`);
  } catch {
    await message.channel.send("Failed to get the average reward.");
  }
}

module.exports = {
  reward: {
    execute: rewardCommand,
  },
};
