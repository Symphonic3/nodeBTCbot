const { createDeepWatchedJsonStore } = require("../utils/utils");

const MEMOS = createDeepWatchedJsonStore("./data/memos.json");

// Add a new memo
function addMemo(title, content) {
  // Check if the memo already exists
  if (MEMOS[title]) {
    return "Memo with this title already exists.";
  }
  
  // Add the new memo to the store
  MEMOS[title] = content;
  return `Memo '${title}' added.`;
}

// Edit an existing memo
function editMemo(title, newContent) {
  // Check if the memo exists
  if (!MEMOS[title]) {
    return "Memo not found.";
  }
  
  // Update the memo content
  MEMOS[title] = newContent;
  return `Memo '${title}' edited.`;
}

// Remove a memo
function removeMemo(title) {
  // Check if the memo exists
  if (!MEMOS[title]) {
    return "Memo not found.";
  }
  
  // Remove the memo from the store
  delete MEMOS[title];
  return `Memo '${title}' removed.`;
}

// Get a specific memo
function getMemo(title) {
  // Check if the memo exists
  if (!MEMOS[title]) {
    return "Memo not found.";
  }
  
  // Return the memo content
  return MEMOS[title];
}

// List all memos
function memosList() {
  const titles = Object.keys(MEMOS);
  
  // Check if there are no memos
  if (titles.length === 0) {
    return "No memos found.";
  }

  // Return the list of titles
  return "Memos: " + titles.join(", ");
}

function isMemo(title) {
  return MEMOS[title];
}

module.exports = { addMemo, removeMemo, editMemo, getMemo, memosList, isMemo }