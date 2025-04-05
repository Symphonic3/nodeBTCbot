const { AttachmentBuilder } = require("discord.js");
const { getCaptchaImage, captchaForUser } = require("../services/captcha");

// eslint-disable-next-line no-unused-vars
async function captcha(message, args) {
  if (process.env.ENABLE_ANTI_BOT === "1") {
    try {
      await message.author.send("Please complete the following captcha:");

      const attachment = new AttachmentBuilder(await getCaptchaImage(captchaForUser(message.author.id)), { name: 'captcha.png' });
      await message.author.send({ files: [attachment] });
    } catch (error) {
      console.error('Error sending captcha to new member:', error);
    }
  }
}

module.exports = {
  captcha: {
    execute: captcha
  }
}