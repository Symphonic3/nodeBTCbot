const { checkDataEdit } = require("../utils/discordutils");

/**
 * Discord-ready wrapper for tagged repo manager
 */
class DiscordRepoWrapper {
  constructor(repoManager) {
    this.repoManager = repoManager;
  }

  // Expects: !additem <itemname> <tag1> [tag2] [tag3]...
  async handleAddRepoItem(message, args) {
    if (!await checkDataEdit(message)) return;

    const itemname = args[0];
    if (!itemname) {
      return message.reply("Please specify an item name.");
    }
    const tags = args.slice(1);
    if (tags.length === 0) {
      return message.reply("Please provide at least one tag.");
    }
    const result = this.repoManager.addRepoItem(itemname, tags);
    if (result) {
      message.reply(`Item "${itemname}" added with tags: ${tags.join(", ")}`);
    } else {
      message.reply(`Item "${itemname}" already exists.`);
    }
  }

  // Expects: !removeitem <itemname>
  async handleRemoveRepoItem(message, args) {
    if (!await checkDataEdit(message)) return;

    const itemname = args[0];
    if (!itemname) {
      return message.reply("Please specify an item name to remove.");
    }
    const result = this.repoManager.removeRepoItem(itemname);
    if (result) {
      message.reply(`Item "${itemname}" removed.`);
    } else {
      message.reply(`Item "${itemname}" does not exist.`);
    }
  }

  // Expects: !addtag <itemname> <tag>
  async handleAddTag(message, args) {
    if (!await checkDataEdit(message)) return;

    const itemname = args[0];
    const tag = args[1];
    if (!itemname || !tag) {
      return message.reply("Please specify an item name and a tag to add.");
    }
    const result = this.repoManager.addTagToRepoItem(itemname, tag);
    if (result) {
      message.reply(`Tag "${tag}" added to item "${itemname}".`);
    } else {
      message.reply(
        `Could not add tag. Either item "${itemname}" doesn't exist or the tag is already present.`
      );
    }
  }

  // Expects: !removetag <itemname> <tag>
  async handleRemoveTag(message, args) {
    if (!await checkDataEdit(message)) return;

    const itemname = args[0];
    const tag = args[1];
    if (!itemname || !tag) {
      return message.reply("Please specify an item name and a tag to remove.");
    }
    const result = this.repoManager.removeTagFromRepoItem(itemname, tag);
    if (result) {
      message.reply(`Tag "${tag}" removed from item "${itemname}".`);
    } else {
      message.reply(
        `Could not remove tag. Either item "${itemname}" doesn't exist or the tag isn't present.`
      );
    }
  }

  // Expects: !setlink <itemname> <link>
  async handleSetLink(message, args) {
    if (!await checkDataEdit(message)) return;

    const itemname = args[0];
    const link = args[1];
    if (!itemname || !link) {
      return message.reply("Please specify an item name and a link.");
    }
    const result = this.repoManager.setRepoItemLink(itemname, link);
    if (result) {
      message.reply(`Link for item "${itemname}" set to "${link}".`);
    } else {
      message.reply(`Could not set link. Item "${itemname}" does not exist.`);
    }
  }

  // Expects: !alltags (no arguments)
  // eslint-disable-next-line no-unused-vars
  async handleGetAllTags(message, args) {
    const tags = this.repoManager.getAllTags();
    message.reply(`All tags: ${tags.join(", ")}`);
  }

  async handleLookup(message, args) {
    // If no tags are specified, get a list of all items.
    let items;
    if (args.length === 0) {
      // If no arguments (tags) are passed, get all items.
      items = this.repoManager.lookup(); // This should return all items.
      
      // Create a shortened comma-separated list of all wallet names.
      let allItemsList = Object.keys(items).join(", ");
      return message.reply(`All items: ${allItemsList}`);
    }
  
    // If tags are specified, perform lookup based on the tags.
    items = this.repoManager.lookup(args);
  
    // If no items are found, reply accordingly.
    if (Object.keys(items).length === 0) {
      return message.reply("No matching items found.");
    }
  
    // Format the reply message for the found items.
    let reply = "Matching items:\n";
    for (const item in items) {
      if (Object.hasOwnProperty.call(items, item)) {
        const { tags, link } = items[item];
        reply += `**${item}**: ${link ? "<"+link+">" : ""} tags: ${tags.join(", ")}\n`;
      }
    }
    
    message.reply(reply);
  }
  
}

module.exports = DiscordRepoWrapper;
