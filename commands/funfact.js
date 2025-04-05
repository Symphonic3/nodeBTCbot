const { generateFunFact } = require("../services/funfacts")

// eslint-disable-next-line no-unused-vars
async function funfact(message, args) {
  await message.channel.send(generateFunFact());
}

module.exports = {
  funfact: {
    execute: funfact
  },
  ff: {
    execute: funfact
  }
}