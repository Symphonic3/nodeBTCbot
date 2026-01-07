const { save, load } = require("../utils/utils");

const FILEPATH = "./data/modlog.json";
const MODLOG = load(FILEPATH);

function activate(userid) {
  if (!MODLOG[userid]) {
    MODLOG[userid] = [];
    save(MODLOG, FILEPATH);
  }
}

function modLogAdd(userid, item, doActivate) {
  if (doActivate) {
    activate(userid);
  }

  if (!MODLOG[userid])
    return;

  MODLOG[userid].push({ sec: Math.round(Date.now() / 1000), message: item });
  save(MODLOG, FILEPATH);
}

function getModLog(userid) {
  if (!MODLOG[userid])
    return "No saved modlog.";

  return "Modlog:\n\n" + MODLOG[userid].map((item, i) => `[${i}] <t:${item.sec}>: ${item.message}`).join("\n");
}

function modLogRemove(userid, index) {
  if (!MODLOG[userid])
    return;

  if (MODLOG[userid].length <= index)
    return;

  MODLOG[userid].splice(index, 1);
  save(MODLOG, FILEPATH);
}

module.exports = { activate, modLogAdd, getModLog, modLogRemove }