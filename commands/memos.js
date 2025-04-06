const { checkDataEdit } = require('../utils/discordutils');
const { addMemo, editMemo, removeMemo, getMemo, memosList } = require('../services/memos');

// Add Memo Command
async function addMemoCommand(message, args) {
  if (!await checkDataEdit(message)) return;

  const title = args[0];
  const content = args.slice(1).join(" ");
  const result = addMemo(title, content);
  await message.channel.send(result);
}

// Edit Memo Command
async function editMemoCommand(message, args) {
  if (!await checkDataEdit(message)) return;

  const title = args[0];
  const newContent = args.slice(1).join(" ");
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
  await message.channel.send(result);
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