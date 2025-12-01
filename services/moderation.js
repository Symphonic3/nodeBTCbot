const { createSavable } = require("../utils/utils");

const MODLOG = createSavable("./data/modlog.json");

function activate(userid) {
  if (!MODLOG[userid]) {
    MODLOG[userid] = [];
    MODLOG.save();
  }
}

function logMod(userid, item, doActivate) {
  if (doActivate) {
    activate(userid);
  }

  if (!MODLOG[userid])
    return;

  MODLOG[userid].push({ sec: Math.round(Date.now() / 1000), message: item });
  MODLOG.save();
}

function getModLog(userid) {
  if (!MODLOG[userid])
    return "No saved modlog.";

  return "Modlog:\n\n" + MODLOG[userid].map(item => `<t:${item.sec}>: ${item.message}`).join("\n");
}

module.exports = { activate, logMod, getModLog }