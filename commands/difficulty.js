const axios = require('axios');

// eslint-disable-next-line no-unused-vars
async function getDifficulty(message) {
  const api = "https://blockchain.info/q/getdifficulty";

  try {
    const response = await axios.get(api);
    
    const difficultyRaw = parseFloat(response.data);
    const difficultyTrillions = difficultyRaw / 1e12;
    const difficultyFormatted = difficultyTrillions.toFixed(2) + " T";

    const messageString = `The current Bitcoin network difficulty is ${difficultyFormatted}.`;

    await message.channel.send(messageString);
  } catch (err) {
    console.error(err);
    await message.channel.send("Error fetching Bitcoin network difficulty.");
  }
}

module.exports = {
  difficulty: {
    execute: getDifficulty
  }
};
