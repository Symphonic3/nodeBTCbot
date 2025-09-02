const axios = require('axios');

// eslint-disable-next-line no-unused-vars
async function nodesCommand(message, args) {
  const api = "https://bitnodes.io/api/v1/snapshots/";
  try {
    const response = await axios.get(api);
    const nodeCount = response.data.results[0].total_nodes;
    const messageString = "The number of reachable nodes is " + nodeCount;
    await message.channel.send(messageString);
  } catch {
    await message.channel.send("Error fetching reachable nodes count.");
  }
}

module.exports = {
  nodes: {
    execute: nodesCommand
  }
};
