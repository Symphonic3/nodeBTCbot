const axios = require('axios');

// eslint-disable-next-line no-unused-vars
async function mempoolCommand(message, args) {
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

  const nTx = data.reduce((agg, curr) => agg + curr.nTx, 0);
  const aggSize = data.reduce((agg, curr) => agg + curr.blockVSize, 0);
  const totalFees = data.reduce((agg, curr) => agg + curr.totalFees, 0);

  // Build the message string with a code block
  const messageString = `\`\`\`
Mempool.space's mempool has ${f(nTx)} TX and is ${f(aggSize / 1_000_000)} vMB
Total fees in mempool are ${f(totalFees/ 1_0000_0000)} BTC
The next projected block (mempool tip) ranges between ${f(data[0].feeRange[data[0].feeRange.length - 1])} sat/vbyte and ${f(data[0].feeRange[0])} sat/vbyte
1-2 blocks = ${f(data[0].feeRange[data[0].feeRange.length - 1])}-${f(data[1].feeRange[0])} sat/vbyte
3-${data.length - 1} blocks = ${f(data[2].feeRange[data[2].feeRange.length - 1])}-${f(data[data.length - 2].feeRange[0])} sat/vbyte
Remaining = ${f(data[data.length - 1].feeRange[data[data.length - 1].feeRange.length - 1])}-${f(data[data.length - 1].feeRange[0])} sat/vbyte
\`\`\``;

  await message.channel.send(messageString);
}

module.exports = {
  mempool: {
    execute: mempoolCommand
  }
};
