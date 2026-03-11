const { ChannelType } = require('discord.js');
const { deleteArticleById } = require('../services/articles');
const { canEditData } = require('../utils/discordutils');

const ARTICLE_LINK_REGEX = /https:\/\/btcmaxis\.com\/article\.html\?id=([0-9a-fA-F-]{36})/i;

function canUserDeleteArticle(member) {
  return canEditData(member);
}


function isInConfiguredArticleForumThread(message) {
  if (!message?.channel?.isThread?.())
    return false;

  const parentChannel = message.channel.parent;
  if (!parentChannel || parentChannel.type !== ChannelType.GuildForum)
    return false;

  const configuredChannel = String(process.env.ARTICLE_CHANNEL || '').trim();
  if (!configuredChannel)
    return false;

  return parentChannel.id === configuredChannel || parentChannel.name === configuredChannel;
}
async function fetchReplyTarget(message) {
  if (!message?.reference?.messageId)
    return null;

  return message.fetchReference().catch(() => null);
}

async function fetchThreadParentPost(message) {
  if (!message?.channel?.isThread?.())
    return null;

  if (message.channel.parent?.type !== ChannelType.GuildForum)
    return null;

  if (typeof message.channel.fetchStarterMessage === 'function') {
    const starterMessage = await message.channel.fetchStarterMessage().catch(() => null);
    if (starterMessage)
      return starterMessage;
  }

  if (typeof message.channel.parent?.messages?.fetch === 'function')
    return message.channel.parent.messages.fetch(message.channel.id).catch(() => null);

  return null;
}

function extractArticleIdFromMessage(message) {
  const content = String(message?.content || '');
  const match = content.match(ARTICLE_LINK_REGEX);
  return match?.[1] || null;
}

function isForumParentPost(message) {
  if (!message?.channel?.isThread?.())
    return false;

  if (message.channel.parent?.type !== ChannelType.GuildForum)
    return false;

  return message.id === message.channel.id;
}

async function deleteArticleCommand(message, args) {
  if (process.env.ENABLE_ARTICLES !== '1') {
    await message.reply('Article system is disabled.');
    return;
  }

  if (!message.guild) {
    await message.reply('This command can only be used in a server.');
    return;
  }

  let member = message.member;
  if (!member)
    member = await message.guild.members.fetch(message.author.id).catch(() => null);

  if (!canUserDeleteArticle(member)) {
    await message.reply('You do not have permission to delete articles.');
    return;
  }

  let articleId = extractArticleIdFromMessage(message);
  let target = null;
  let targetSource = null;

  if (!articleId) {
    target = await fetchReplyTarget(message);
    targetSource = target ? 'reply' : null;

    if (!target) {
      const inArticleThread = isInConfiguredArticleForumThread(message);
      if (!inArticleThread) {
        await message.reply(
          `Reply to an article post with \`${message.client.prefix}delete\`, or include a btcmaxis article link.`
        );
        return;
      }

      target = await fetchThreadParentPost(message);
      if (target)
        targetSource = 'thread_parent';
    }

    if (!target) {
      // In an article forum thread without a reply target, fail silently.
      return;
    }

    articleId = extractArticleIdFromMessage(target);
    if (!articleId) {
      if (targetSource === 'thread_parent')
        return;

      const targetDescriptor = targetSource === 'thread_parent'
        ? 'this thread parent post'
        : 'the replied message';
      await message.reply(`Could not find an article id in ${targetDescriptor}.`);
      return;
    }
  }

  const result = await deleteArticleById(articleId);
  if (!result.deleted && !result.notFound) {
    const detail = result.error ? ` Error: ${result.error}` : '';
    await message.reply(`Unable to delete article data right now.${detail}`);
    return;
  }

  try {
    if (target && isForumParentPost(target)) {
      await target.channel.delete(`Article removed by ${message.author.tag}`);
      return;
    }

    if (target?.deletable)
      await target.delete();

    await message.reply(`Article ${articleId} removed.`);
  } catch (error) {
    const detail = error?.message ? ` (${error.message})` : '';
    await message.reply(`Article data was removed, but deleting the Discord post failed${detail}.`);
  }
}

module.exports = {
  delete: {
    execute: deleteArticleCommand
  },
  deletearticle: {
    execute: deleteArticleCommand
  },
  delarticle: {
    execute: deleteArticleCommand
  }
};


