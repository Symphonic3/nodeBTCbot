const RepoManager = require("../services/taggedrepo");
const DiscordRepoWrapper = require("../services/taggedrepodiscord");
const { createSavable } = require("../utils/utils");

const discordRepo = new DiscordRepoWrapper(new RepoManager(createSavable("./data/exchanges.json")));

module.exports = {
  exchange: {
    execute: discordRepo.handleLookup.bind(discordRepo)
  },
  ex: {
    execute: discordRepo.handleLookup.bind(discordRepo)
  },
  exchangeadd: {
    execute: discordRepo.handleAddRepoItem.bind(discordRepo)
  },
  exchangeremove: {
    execute: discordRepo.handleRemoveRepoItem.bind(discordRepo)
  },
  exchangeaddtag: {
    execute: discordRepo.handleAddTag.bind(discordRepo)
  },
  exchangeremovetag: {
    execute: discordRepo.handleRemoveTag.bind(discordRepo)
  },
  exchangesetlink: {
    execute: discordRepo.handleSetLink.bind(discordRepo)
  },
  exchangelist: {
    execute: discordRepo.handleGetAllItems.bind(discordRepo)
  }
}