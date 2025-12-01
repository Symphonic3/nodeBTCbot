const { logMod, getModLog } = require("../services/moderation");
const { extractIds, extractReason, checkMod } = require("../utils/discordutils");

async function readModLog(message, args) {
  if (!await checkMod(message)) return;

  const ids = await extractIds(message, args);
  if (ids.length != 1) {
    return await message.channel.send("Specify 1 user.");
  }
  await message.channel.send(getModLog(ids[0]));
}

async function modLogAdd(message, args) {
  if (!await checkMod(message)) return;
  const ids = await extractIds(message, args);
  if (ids.length != 1) {
    return await message.channel.send("Specify 1 user.");
  }
  logMod(ids[0], extractReason(args), true);
  await message.channel.send("Added to user modlog.");
}

module.exports = {
  modlog: {
    execute: readModLog
  },
  modlogadd: {
    execute: modLogAdd
  }
}