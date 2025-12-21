const axios = require('axios');

// eslint-disable-next-line no-unused-vars
async function feeCommand(message, args) {
  const api = "https://mempool.space/api/v1/fees/mempool-blocks";
  let data;
  try {
    const response = await axios.get(api);
    data = response.data;
  } catch {
    return await message.channel.send("Unable to parse mempool data. Try again later.");
  }

  function f(n) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }

  const messageString = `\`\`\`
High Priority (1 block, ~10m) = ${f(data[0].medianFee)} sat/vbyte
Medium Priority (2-6 blocks, ~20m-1h) = ${f(data[3].medianFee)} sat/vbyte
Low Priority (7 blocks, ~1h+) = ${f(data[data.length - 2].medianFee)} sat/vbyte
Very Low Priority = ${f(data[data.length - 1].medianFee)} sat/vbyte
\`\`\``;

  await message.channel.send(messageString);
}

module.exports = {
  fee: {
    execute: feeCommand
  },
  fees: {
    execute: feeCommand
  }
};
