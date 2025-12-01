/**
 * Provides methods for interacting with a generic tagged repo of the following format:
 *
 * {
 *   "itemname": {"tags": ["tag1", "tag2"], "link": "url"},
 *   "...": {"tags": ["...","..."], "link": "..."}
 * }
 * 
 * Each repo object contains:
 * - `tags`: An array of tags associated with the item, e.g., ["p2p", "custodial"].
 * - `link`: A URL link to the item or service.
 */

class RepoManager {
  constructor(repoObject) {
    this.repoObject = repoObject;
  }

  addTagToRepoItem(itemname, tag) {
    if (this.repoObject[itemname]) {
      // If the item exists, add the tag if it's not already present
      if (!this.repoObject[itemname].tags.includes(tag)) {
        this.repoObject[itemname].tags.push(tag);
        this.repoObject.save();
        return true;
      }
      return false; // Tag already exists
    }
    return false; // Item doesn't exist
  }

  removeTagFromRepoItem(itemname, tag) {
    if (this.repoObject[itemname]) {
      const index = this.repoObject[itemname].tags.indexOf(tag);
      if (index > -1) {
        // Remove the tag from the array if it exists
        this.repoObject[itemname].tags.splice(index, 1);
        this.repoObject.save();
        return true;
      }
      return false; // Tag does not exist
    }
    return false; // Item doesn't exist
  }

  setRepoItemLink(itemname, link) {
    if (this.repoObject[itemname]) {
      // Update the link for the item
      this.repoObject[itemname].link = link;
      this.repoObject.save();
      return true;
    }
    return false; // Item doesn't exist
  }

  removeRepoItem(itemname) {
    if (this.repoObject[itemname]) {
      // Delete the item from the repo object
      delete this.repoObject[itemname];
      this.repoObject.save();
      return true;
    }
    return false; // Item doesn't exist
  }

  addRepoItem(itemname, tags) {
    if (!this.repoObject[itemname]) {
      // Add the new item with the provided tags and an empty link
      this.repoObject[itemname] = { tags: tags, link: '' };
      this.repoObject.save();
      return true;
    }
    return false; // Item already exists
  }

  getAllTags() {
    let allTags = [];
    for (const item in this.repoObject) {
      if (Object.hasOwnProperty.call(this.repoObject, item)) {
        allTags = allTags.concat(this.repoObject[item].tags);
      }
    }
    // Return unique tags
    return [...new Set(allTags)];
  }

  /**
   * Looks up items by tags. If no tags are provided, returns all items.
   *
   * @param {string[]} tags - An array of tags to filter items by.
   * @returns {Object} A subset of the repoObject containing only matching items.
   */
  lookup(tags) {
    // If no tags specified or empty array, return all items.
    if (!tags || tags.length === 0) {
      return this.repoObject;
    }

    // Otherwise, filter the repo to include only items that have all the specified tags.
    const result = {};
    for (const item in this.repoObject) {
      if (Object.hasOwnProperty.call(this.repoObject, item)) {
        // Check if the item's tags include every tag in the lookup array.
        if (tags.every(tag => this.repoObject[item].tags.includes(tag))) {
          result[item] = this.repoObject[item];
        }
      }
    }
    return result;
  }

}

module.exports = RepoManager;