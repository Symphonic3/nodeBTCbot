const axios = require('axios');

 
async function addressCommand(message, args) {
  if (args.length !== 1) {
    return await message.channel.send("The address command requires an address following it.");
  }

  const api = `https://blockstream.info/api/address/${args[0]}`;
  let data;
  try {
    const response = await axios.get(api);
    data = response.data;
  } catch {
    return await message.channel.send("Invalid argument, please provide a valid address");
  }

  const chainStats = data.chain_stats;
  const mempoolStats = data.mempool_stats;
  
  const balance = chainStats.funded_txo_sum - chainStats.spent_txo_sum;
  const mempoolAmt = mempoolStats.funded_txo_sum - mempoolStats.spent_txo_sum;

  const formattedBalance = balance.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const receivedCount = chainStats.funded_txo_count.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const receivedAmt = chainStats.funded_txo_sum.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const sentCount = chainStats.spent_txo_count.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const sentAmt = chainStats.spent_txo_sum.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const mempoolCount = mempoolStats.tx_count.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formattedMempoolAmt = mempoolAmt.toLocaleString('en-US', { maximumFractionDigits: 0 });

  const messageString = `View in [bitcointech.wiki/editor](<https://bitcointech.wiki/editor?d=${data.address}>)\`\`\`
Address ${data.address}
Balance is ${formattedBalance} sat
Received ${receivedCount} TXO for ${receivedAmt} sat
Sent ${sentCount} TXO for ${sentAmt} sat
${mempoolCount} TX in mempool for ${formattedMempoolAmt} sat
\`\`\``;

  await message.channel.send(messageString);
}

module.exports = {
  address: {
    execute: addressCommand
  }
};