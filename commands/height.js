const axios = require('axios');

// eslint-disable-next-line no-unused-vars
async function heightCommand(message, args) {
  const api = "https://blockstream.info/api/blocks/tip/height";
  try {
    const response = await axios.get(api);
    const height = response.data;
    const messageString = "The current block height is " + height;
    await message.channel.send(messageString);
  } catch {
    await message.channel.send("Error fetching block height.");
  }
}

module.exports = {
  height: {
    execute: heightCommand
  }
};
