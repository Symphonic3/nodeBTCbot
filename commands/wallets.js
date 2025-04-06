const RepoManager = require("../services/taggedrepo");
const DiscordRepoWrapper = require("../services/taggedrepodiscord");
const { createDeepWatchedJsonStore } = require("../utils/utils");

const discordRepo = new DiscordRepoWrapper(new RepoManager(createDeepWatchedJsonStore("./data/wallets.json")));

module.exports = {
  wallet: {
    execute: discordRepo.handleLookup.bind(discordRepo)
  },
  w: {
    execute: discordRepo.handleLookup.bind(discordRepo)
  },
  walletadd: {
    execute: discordRepo.handleAddRepoItem.bind(discordRepo)
  },
  walletremove: {
    execute: discordRepo.handleRemoveRepoItem.bind(discordRepo)
  },
  walletaddtag: {
    execute: discordRepo.handleAddTag.bind(discordRepo)
  },
  walletremovetag: {
    execute: discordRepo.handleRemoveTag.bind(discordRepo)
  },
  walletsetlink: {
    execute: discordRepo.handleSetLink.bind(discordRepo)
  },
  wallettags: {
    execute: discordRepo.handleGetAllTags.bind(discordRepo)
  }
}