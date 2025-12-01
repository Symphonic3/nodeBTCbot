const axios = require('axios');

 
async function getDifficulty(message) {
  const api = "https://mempool.space/api/v1/mining/difficulty-adjustments/1m";

  try {
    const response = await axios.get(api);
    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Unexpected response format or empty data");
    }

    const latest = data[0];
    const [_timestamp, _blockHeight, difficultyRaw, diffRatio] = latest;
    const difficultyTrillions = difficultyRaw / 1e12;

    const messageString = `• Difficulty (raw): ${difficultyRaw}\n` +
      `• Difficulty: ${difficultyTrillions.toFixed(2)} T\n` +
      `• Change ratio: ×${diffRatio.toFixed(5)}`;

    await message.channel.send(messageString);
  } catch {
    await message.channel.send("Error fetching Bitcoin difficulty data.");
  }
}

module.exports = {
  difficulty: {
    execute: getDifficulty
  }
};
