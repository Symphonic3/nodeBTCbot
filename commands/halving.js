const axios = require("axios");

// eslint-disable-next-line no-unused-vars
async function halvingCommand(message, args) {
  const api = "https://blockstream.info/api/blocks/tip/height";
  let height;

  try {
    const response = await axios.get(api);
    height = parseInt(response.data, 10);
  } catch {
    return await message.channel.send("Failed to fetch current block height.");
  }

  const remainder = 210000 - (height % 210000);
  const days = (remainder * 10) / 60 / 24;
  const minutesUntilHalving = remainder * 10;
  const date = new Date(Date.now() + minutesUntilHalving * 60 * 1000);
  const timestamp = Math.floor(date.getTime() / 1000); // UNIX timestamp in seconds

  const messageString =
    `The halving will happen in ${remainder.toLocaleString()} blocks, ` +
    `or approximately ${Math.round(days).toLocaleString()} days ` +
    `or around <t:${timestamp}>`;

  await message.channel.send(messageString);
}

module.exports = {
  halving: {
    execute: halvingCommand,
  },
  halvening: {
    execute: halvingCommand
  }
};
