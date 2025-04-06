const axios = require('axios');

async function solomine(message, args) {
  if (args.length === 0) {
    return message.channel.send("Please specify a hashrate in TH/s, eg '150'.");
  }

  let solo_hash_rate;
  try {
    solo_hash_rate = parseFloat(args[0]);
  } catch {
    return message.channel.send("Invalid hashrate specified.");
  }

  if (solo_hash_rate <= 0) {
    return message.channel.send("With a hashrate of 0 or less, it'll take you forever to mine a block!");
  }

  //                                                   kilo   mega   giga   tera
  const response = await axios.get('https://mempool.space/api/v1/mining/hashrate/current');
  const network_hashrate = response.data.currentHashrate / 1000 / 1000 / 1000 / 1000; // In TH/s

  const hash_share = solo_hash_rate / network_hashrate;
  const blocks = 1 / hash_share;
  const days = blocks / 6 / 24;

  let time_description = '';
  if (days > 365.2425) {
    time_description = `${(days / 365.2425).toFixed(2)} years`;
  } else {
    time_description = `${days.toFixed(2)} days`;
  }

  const message_string = `With a hashrate of ${solo_hash_rate.toLocaleString('en-US', { maximumFractionDigits: 2 })} TH/s, and a network hashrate of ${network_hashrate.toLocaleString('en-US', { maximumFractionDigits: 4 })} TH/s, it would take on average ${blocks.toLocaleString('en-US', { maximumFractionDigits: 2 })} blocks, or ${time_description} to mine a block.`;

  message.channel.send(message_string);
}

async function mine(message, args) {
  if (args.length !== 4) {
    return message.channel.send("The !mine command requires four arguments: `period` (block/hour/day/week/month/year), `sats/kWh` (electricity cost), `mining watts` (eg: 3247 for an S19j XP), and `joules per terahash` (eg: 21.5 for an S19j XP).");
  }

  const period = args[0].toLowerCase();
  let sats_kwh, mining_watts, joules_per_terahash;

  try {
    sats_kwh = parseFloat(args[1]);
    mining_watts = parseFloat(args[2]);
    joules_per_terahash = parseFloat(args[3]);
  } catch {
    return message.channel.send("Invalid input values. Please make sure all values are numbers.");
  }

  if (mining_watts <= 0) {
    return message.channel.send("Invalid mining watts; mining requires energy!");
  }

  if (joules_per_terahash <= 0) {
    return message.channel.send("Invalid joules per terahash; hashing requires energy!");
  }

  let period_block_count;
  switch (period) {
  case "block":
    period_block_count = 1;
    break;
  case "hour":
    period_block_count = 6;
    break;
  case "day":
    period_block_count = 6 * 24;
    break;
  case "week":
    period_block_count = 6 * 24 * 7;
    break;
  case "month":
    period_block_count = 6 * 24 * 30;
    break;
  case "year":
    period_block_count = 6 * 24 * 365.2425;
    break;
  default:
    return message.channel.send("Invalid calculation period; allowed values are: 'block', 'hour', 'day', 'week', 'month', and 'year'.");
  }

  const reward_block_count = Math.max(6 * 24 * 30, period_block_count);
  const reward_response = await axios.get(`https://mempool.space/api/v1/mining/reward-stats/${reward_block_count}`);
  const average_reward = parseFloat(reward_response.data.totalReward) / reward_block_count / 100000000;

  const network_hashrate_response = await axios.get('https://mempool.space/api/v1/mining/hashrate/current');
  const network_hashrate = network_hashrate_response.data.currentHashrate / 1000 / 1000 / 1000 / 1000; // In TH/s

  const hash_rate = mining_watts / joules_per_terahash;
  const hash_share = hash_rate / network_hashrate;

  const watts_per_block = mining_watts / 6;
  const block_cost = watts_per_block * sats_kwh / 1000 / 100000000;
  const reward_per_block = average_reward * hash_share;

  const watts = watts_per_block * period_block_count;
  const electricity_cost = block_cost * period_block_count;
  const gross_income = reward_per_block * period_block_count;

  const net_income = gross_income - electricity_cost;

  let energy_string = '';
  if (watts >= 1000) {
    energy_string = `${(watts / 1000).toFixed(2)} kWh`;
  } else {
    energy_string = `${watts.toFixed(0)} Wh`;
  }

  const message_string = `Your hashrate is ${hash_rate.toFixed(4)} TH/s, and your expected income each ${period} is ${(net_income).toFixed(8)} BTC. Using ${energy_string} costing ${(electricity_cost).toFixed(8)} BTC, your expected net is ${(net_income).toFixed(8)} BTC.`;

  message.channel.send(message_string);
}

module.exports = {
  solomine: {
    execute: solomine
  },
  mine: {
    execute: mine
  }
};