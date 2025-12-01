const axios = require('axios');

// eslint-disable-next-line no-unused-vars
async function feeCommand(message, args) {
  const api = "https://blockstream.info/api/mempool";
  let data;
  try {
    const response = await axios.get(api);
    data = response.data;
  } catch {
    return await message.channel.send("Unable to parse mempool data. Try again later.");
  }

  // Define fee brackets
  let brackets = [
    [0, 1000000],
    [1000000, 4000000],
    [4000000, 12000000],
    [12000000, 36000000]
  ];

  let n = 0;
  let pendingVsize = 0;

  // Process each entry in the fee histogram
  for (const entry of data.fee_histogram) {
    if (n > brackets.length - 1) break;
    const fee = entry[0];
    const vsize = entry[1];
    if (brackets[n].length <= 2) {
      brackets[n].push(fee);
    }
    const sizeRange = brackets[n][1] - brackets[n][0];
    if (vsize + pendingVsize >= sizeRange) {
      brackets[n].push(fee);
      brackets[n].push(vsize + pendingVsize);
      n++;
      pendingVsize = vsize + pendingVsize - sizeRange;
    } else {
      pendingVsize += vsize;
    }
  }

  // Fill missing values in each bracket if needed
  for (const bracket of brackets) {
    if (bracket.length === 2) {
      bracket.push(0);
    }
    if (bracket.length === 3) {
      bracket.push(0);
    }
  }

  // Format values using toLocaleString with no decimal places
  const high = Math.floor(brackets[0][3]).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const medium = ((brackets[1][3] + brackets[1][2]) / 2).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const low = Math.floor(brackets[2][2]).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const vlow = ((brackets[3][3] + brackets[3][2]) / 2).toLocaleString('en-US', { maximumFractionDigits: 0 });

  const messageString = `\`\`\`
High Priority (1-2 blocks/10m-20m) = ${high} sat/vbyte
Medium Priority (2-6 blocks/20m-1h) = ${medium} sat/vbyte
Low Priority (6 blocks+/1h+) = ${low} sat/vbyte
Very Low Priority (144 blocks+/1d+) = ${vlow} sat/vbyte
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
