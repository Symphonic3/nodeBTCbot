const { createDeepWatchedJsonStore } = require("../utils/utils");

const FACT_LIST = createDeepWatchedJsonStore("./data/funfacts.json");

function generateFunFact() {
  return FACT_LIST[Math.floor(Math.random() * FACT_LIST.length)];
}

module.exports = { generateFunFact }