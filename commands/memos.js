const { checkDataEdit } = require('../utils/discordutils');
const { addMemo, editMemo, removeMemo, getMemo, memosList } = require('../services/memos');

// Add Memo Command
async function addMemoCommand(message, args) {
  if (!await checkDataEdit(message)) return;

  const title = args[0];
  const contentRaw = args.slice(1).join(" ");
  const content = contentRaw.replace(/\\n/g, "\n");  // convert \n to actual newlines
  const result = addMemo(title, content);
  await message.channel.send(result);
}

// Edit Memo Command
async function editMemoCommand(message, args) {
  if (!await checkDataEdit(message)) return;

  const title = args[0];
  const newContentRaw = args.slice(1).join(" ");
  const newContent = newContentRaw.replace(/\\n/g, "\n");  // convert \n to actual newlines
  const result = editMemo(title, newContent);
  await message.channel.send(result);
}


// Remove Memo Command
async function removeMemoCommand(message, args) {
  if (!await checkDataEdit(message)) return;

  const title = args[0];
  const result = removeMemo(title);
  await message.channel.send(result);
}

// Get Memo Command
async function getMemoCommand(message, args) {
  const title = args[0];
  const result = getMemo(title);
  let user = '';
  if (message.reference) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      user = `${repliedMsg.author}\n`;
    } catch (err) {
      console.error("Could not fetch replied message:", err);
    }
  }
  await message.channel.send(`${user}${result}`);
}

// Get Raw Memo Command
async function getRawMemoCommand(message, args) {
  const title = args[0];
  const result = getMemo(title);
  await message.channel.send("```" + result.replace(/\n/g, "\\n") + "```");
}

// List Memos Command
// eslint-disable-next-line no-unused-vars
async function memosListCommand(message, args) {
  const result = memosList();
  await message.channel.send(result);
}

module.exports = {
  memo: {
    execute: getMemoCommand
  },
  m: {
    execute: getMemoCommand
  },
  memoraw: {
    execute: getRawMemoCommand
  },
  memoedit: {
    execute: editMemoCommand
  },
  memoremove: {
    execute: removeMemoCommand
  },
  memoadd: {
    execute: addMemoCommand
  },
  memolist: {
    execute: memosListCommand
  },
};