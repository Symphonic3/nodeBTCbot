const { saveItem, editItemPrice } = require("../services/items.js");
const { checkDataEdit } = require("../utils/discordutils.js");
 
async function addItem(message, args) {
  if (!(await checkDataEdit(message))) return; // No permission

  if (args.length < 3 || args.length > 5) {
    await message.reply(
      "The additem command requires 3 to 5 parameters: the calling code of the item (3 characters please), the full name of the item (in quotes), the price of the item in USD, an emoji for the item without colons : bracing it just the keyword (optional), and whether the item should be default priced as a single item or not (optional). Example: `additem mac \"McDonalds Big Mac\" 5.71 hamburger single`");
    return;
  }

  const output = saveItem(
    args[0], 
    args[1], 
    args[2], 
    "add", 
    message.author.username, 
    args[3] || '',
    args[4] || ''
  );

  await message.reply(output);
  return;
}

async function editItem(message, args) {
  if (!(await checkDataEdit(message))) return; // No permission

  if (args.length < 3 || args.length > 5) {
    await message.reply(
      "The edititem command requires 3 to 5 parameters: the calling code of the item (3 characters please), the full name of the item (in quotes), the price of the item in USD, an emoji for the item without colons : bracing it just the keyword (optional), and whether the item should be default priced as a single item or not (optional). Example: `edititem mac \"McDonalds Big Mac\" 5.71 hamburger single`");
    return;
  }

  const output = saveItem(
    args[0], 
    args[1], 
    args[2], 
    "edit", 
    message.author.username, 
    args[3] || '',
    args[4] || ''
  );

  await message.reply(output);
  return;
}

async function editPrice(message, args) {
  if (!(await checkDataEdit(message))) return; // No permission

  if (args.length != 2) {
    await message.reply(
      "The editprice command requires 2 parameters, the item code to edit and the price to change it to. ex. `editprice mac 3.99`");
    return;
  }

  const output = editItemPrice(args[0], args[1]);

  await message.reply(output);
  return;
}

module.exports = {
  additem: {
    execute: addItem
  },
  edititem: {
    execute: editItem
  },
  editprice: {
    execute: editPrice
  }
}