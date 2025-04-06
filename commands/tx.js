const axios = require('axios');

function formatDate(date) {
  const pad = num => num.toString().padStart(2, '0');
  const day = pad(date.getUTCDate());
  const month = pad(date.getUTCMonth() + 1);
  const year = date.getUTCFullYear();
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} UTC`;
}

async function txCommand(message, args) {
  if (args.length !== 1) {
    return message.channel.send("The tx command requires a tx hash following it.");
  }
  const api = `https://blockstream.info/api/tx/${args[0]}`;
  let data;
  try {
    const response = await axios.get(api);
    data = response.data;
  } catch {
    return message.channel.send("Invalid argument, please provide a valid tx hash");
  }

  let confirmed = "Unconfirmed";
  let block = "";
  let time = "";
  if (data.status && data.status.confirmed) {
    confirmed = "Confirmed";
    block = Number(data.status.block_height).toLocaleString('en-US', { maximumFractionDigits: 0 });
    const blockTime = new Date(data.status.block_time * 1000);
    time = formatDate(blockTime);
  }

  const amount = data.vout.reduce((sum, v) => sum + v.value, 0);
  const fee = data.fee;
  const size = data.weight / 4;
  const feerate = fee / size;
  const feepercent = fee / amount * 100;
  const inputs = data.vin.length;
  const outputs = data.vout.length;

  const message_string = `View in [bitcointech.wiki/editor](<https://bitcointech.wiki/editor?d=${data.txid}>)\`\`\`TX ${data.txid}
${confirmed} ${block} ${time}
Sent ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} sat for ${fee.toLocaleString('en-US', { maximumFractionDigits: 0 })} sat fee (${feerate.toLocaleString('en-US', { maximumFractionDigits: 2 })} sat/vbtye, ${feepercent.toLocaleString('en-US', { maximumFractionDigits: 2 })}%)
${inputs} inputs, ${outputs} outputs, ${size.toLocaleString('en-US', { maximumFractionDigits: 2 })} vbytes
\`\`\``;

  await message.channel.send(message_string);
}

module.exports = {
  tx: {
    execute: txCommand
  }
};