const { modLogAdd, getModLog, modLogRemove } = require("../services/moderation");
const { extractIds, extractReason, checkMod } = require("../utils/discordutils");

async function getModLogCommand(message, args) {
  if (!await checkMod(message)) return;

  const ids = await extractIds(message, args);
  if (ids.length != 1) {
    return await message.channel.send("Specify 1 user.");
  }
  await message.channel.send(getModLog(ids[0]));
}

async function modLogAddCommand(message, args) {
  if (!await checkMod(message)) return;
  
  const ids = await extractIds(message, args);
  if (ids.length != 1) {
    return await message.channel.send("Specify 1 user.");
  }
  modLogAdd(ids[0], extractReason(args), true);
  await message.channel.send("Added to user modlog.");
}

async function modLogRemoveCommand(message, args) {
  if (!await checkMod(message)) return;

  const ids = await extractIds(message, args);
  if (ids.length != 1) {
    return await message.channel.send("Specify 1 user.");
  }

  const intidx = parseInt(extractReason(args));
  if (isNaN(intidx))
    return await message.channel.send("Invalid index.");

  modLogRemove(ids[0], intidx);
  await message.channel.send("Removed from user modlog.");
}

module.exports = {
  modlog: {
    execute: getModLogCommand
  },
  modlogadd: {
    execute: modLogAddCommand
  },
  modlogremove: {
    execute: modLogRemoveCommand
  }
}