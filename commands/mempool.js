const axios = require('axios');

// eslint-disable-next-line no-unused-vars
async function mempoolCommand(message, args) {
  const api = "https://blockstream.info/api/mempool";
  let data;
  try {
    const response = await axios.get(api);
    data = response.data;
  } catch (err) {
    return message.channel.send("Unable to parse mempool data. Try again later.");
  }

  // Define the fee brackets
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
    // If bracket has only two elements, append the current fee
    if (brackets[n].length <= 2) {
      brackets[n].push(fee);
    }
    const sizeRange = brackets[n][1] - brackets[n][0];
    if (vsize + pendingVsize >= sizeRange) {
      brackets[n].push(fee); // top fee for the bracket
      brackets[n].push(vsize + pendingVsize); // actual vsize that met or exceeded range
      n++;
      pendingVsize = vsize + pendingVsize - sizeRange;
    } else {
      pendingVsize += vsize;
    }
  }

  // Fill missing values in each bracket with 0 if necessary
  for (const bracket of brackets) {
    if (bracket.length === 2) {
      bracket.push(0);
    }
    if (bracket.length === 3) {
      bracket.push(0);
    }
  }

  // Format numbers using toLocaleString for comma separation
  const formattedCount = Number(data.count).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formattedSize = (data.vsize / 1000000).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const formattedFees = (data.total_fee / 100000000).toLocaleString('en-US', { maximumFractionDigits: 2 });

  const range01 = (brackets[0][1] / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range0bottomMB = Number(brackets[0][3]).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range0topMB = Number(brackets[0][2]).toLocaleString('en-US', { maximumFractionDigits: 0 });

  const range10 = (brackets[1][0] / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range11 = (brackets[1][1] / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range1bottomMB = Number(brackets[1][3]).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range1topMB = Number(brackets[1][2]).toLocaleString('en-US', { maximumFractionDigits: 0 });

  const range20 = (brackets[2][0] / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range21 = (brackets[2][1] / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range2bottomMB = Number(brackets[2][3]).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range2topMB = Number(brackets[2][2]).toLocaleString('en-US', { maximumFractionDigits: 0 });

  const range30 = (brackets[3][0] / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range31 = (brackets[3][1] / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range3bottomMB = Number(brackets[3][3]).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const range3topMB = Number(brackets[3][2]).toLocaleString('en-US', { maximumFractionDigits: 0 });

  // Build the message string with a code block
  const messageString = `\`\`\`
Blockstream's mempool has ${formattedCount} TX and is ${formattedSize} MB
Total fees in mempool are ${formattedFees} BTC
The tip of the mempool (${range01}MB) ranges between ${range0bottomMB} sat/vbyte and ${range0topMB} sat/vbyte
${range10}MB - ${range11}MB = ${range1bottomMB}-${range1topMB} sat/vbyte
${range20}MB - ${range21}MB = ${range2bottomMB}-${range2topMB} sat/vbyte
${range30}MB - ${range31}MB = ${range3bottomMB}-${range3topMB} sat/vbyte
\`\`\``;

  await message.channel.send(messageString);
}

module.exports = {
  mempool: {
    execute: mempoolCommand
  }
};
