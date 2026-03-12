const { ChannelType } = require('discord.js');
const { createDraftArticle, setArticleForumPostUrl } = require('../services/articles');
const { canEditData } = require('../utils/discordutils');

const DISCORD_MESSAGE_LINK_REGEX = /<?https?:\/\/(?:canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)>?/gi;
const ARTICLE_HELP_RESPONSE = "The calling structure for making an article is ```!article <title>\n<content>``` where every message link will be exactly that message content, including images and most markdown formatting. All the messages, including the parent one, and their white space are respected. You're stitching them together as they literally are.\n\nOnce an article has been made it will show up in the articles forum. Reply '!delete' in the forum to remove the article from the forum and the website. To promote the article to the BTCMaxis articles list, react in the forum with a :btc: emoji";

function canUserCreateArticle(member) {
  return canEditData(member);
}

async function formatAuthorProfile(sourceMessage) {
  const discordUsername = sourceMessage?.author?.username;
  if (!discordUsername) {
    return {
      username: 'Anonymous',
      image: ''
    };
  }

  let displayName = sourceMessage?.member?.displayName;

  if (!displayName && sourceMessage?.guild && sourceMessage?.author?.id) {
    const fetchedMember = await sourceMessage.guild.members.fetch(sourceMessage.author.id).catch(() => null);
    displayName = fetchedMember?.displayName;
  }

  if (!displayName || /unknown|deleted/i.test(discordUsername) || /unknown|deleted/i.test(displayName)) {
    return {
      username: 'Anonymous',
      image: ''
    };
  }

  return {
    username: `${discordUsername} (${displayName})`,
    image: sourceMessage?.author?.displayAvatarURL?.() ?? ''
  };
}

function addUniqueAuthor(authorMap, profile) {
  const username = String(profile?.username || '').trim() || 'Anonymous';
  const image = String(profile?.image || '');

  if (!authorMap.has(username)) {
    authorMap.set(username, image);
    return;
  }

  const existing = authorMap.get(username);
  if (!existing && image)
    authorMap.set(username, image);
}

function parseArticleCommandInput(message) {
  const prefix = message.client.prefix || '!';
  const raw = String(message.content || '');

  if (!raw.startsWith(prefix))
    return { title: '', bodyTemplate: '' };

  const withoutPrefix = raw.slice(prefix.length);
  const commandMatch = withoutPrefix.match(/^\s*article\b/i);
  if (!commandMatch)
    return { title: '', bodyTemplate: '' };

  const remainder = withoutPrefix.slice(commandMatch[0].length).replace(/^\s*/, '');
  if (!remainder)
    return { title: '', bodyTemplate: '' };

  const newlineIndex = remainder.indexOf('\n');
  if (newlineIndex === -1) {
    return {
      title: remainder.trim(),
      bodyTemplate: ''
    };
  }

  return {
    title: remainder.slice(0, newlineIndex).trim(),
    bodyTemplate: remainder.slice(newlineIndex + 1).trim()
  };
}

async function resolveArticleForumChannel(guild) {
  const configuredChannel = process.env.ARTICLE_CHANNEL;
  if (!configuredChannel || !guild)
    return null;

  let channel = guild.channels.cache.get(configuredChannel)
    || guild.channels.cache.find(ch => ch.name === configuredChannel);

  if (!channel && /^\d+$/.test(configuredChannel)) {
    channel = await guild.channels.fetch(configuredChannel).catch(() => null);
  }

  if (!channel || channel.type !== ChannelType.GuildForum)
    return null;

  return channel;
}

async function fetchLinkedDiscordMessage(commandMessage, guildId, channelId, messageId) {
  if (!commandMessage.guild)
    throw new Error('Articles can only be created inside a server.');

  if (String(commandMessage.guild.id) !== String(guildId))
    throw new Error('All linked messages must be from this server.');

  let channel = commandMessage.guild.channels.cache.get(channelId);
  if (!channel) {
    channel = await commandMessage.guild.channels.fetch(channelId).catch(() => null);
  }

  if (!channel || typeof channel.messages?.fetch !== 'function')
    throw new Error(`Unable to access linked channel ${channelId}.`);

  const linkedMessage = await channel.messages.fetch(messageId).catch(() => null);
  if (!linkedMessage)
    throw new Error(`Unable to load linked message ${messageId}.`);

  return linkedMessage;
}

function isImageAttachment(attachment) {
  if (!attachment)
    return false;

  const contentType = String(attachment.contentType || '').toLowerCase();
  if (contentType.startsWith('image/'))
    return true;

  if (typeof attachment.width === 'number' && attachment.width > 0)
    return true;

  const url = String(attachment.url || '').toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)(?:\?.*)?$/.test(url);
}

function collectLinkedMessageContent(message) {
  const messageBody = String(message?.content || '');
  const imageLinks = Array
    .from(message?.attachments?.values?.() || [])
    .filter(isImageAttachment)
    .map(attachment => String(attachment.url || '').trim())
    .filter(Boolean);

  if (!imageLinks.length)
    return messageBody;

  if (!messageBody.trim())
    return imageLinks.join('\n');

  return `${messageBody}\n${imageLinks.join('\n')}`;
}

async function resolvePromotionEmojiToken(guild) {
  const fallback = ':btc:';
  if (!guild?.emojis)
    return fallback;

  let emoji = guild.emojis.cache.find(entry => String(entry.name || '').toLowerCase() === 'btc');
  if (!emoji) {
    await guild.emojis.fetch().catch(() => null);
    emoji = guild.emojis.cache.find(entry => String(entry.name || '').toLowerCase() === 'btc');
  }

  if (!emoji)
    return fallback;

  const animatedPrefix = emoji.animated ? 'a' : '';
  return `<${animatedPrefix}:${emoji.name}:${emoji.id}>`;
}

function buildPreviewContent(article, promotionEmoji) {
  const articleUrl = `https://btcmaxis.com/article.html?id=${article.id}`;
  const emojiToken = String(promotionEmoji || ':btc:');
  const snippet = String(article.content || '').slice(0, 1700);

  return `[Full Article Here](${articleUrl})\n${snippet}... [Read More](${articleUrl})\n\nReact with ${emojiToken} to promote this article to the front page of btcmaxis.com`;
}
async function articleCommand(message, args) {
  if (process.env.ENABLE_ARTICLES !== '1') {
    await message.reply('Article system is disabled.');
    return;
  }

  if (!message.guild) {
    await message.reply('Articles can only be created in a server channel.');
    return;
  }

  const forumChannel = await resolveArticleForumChannel(message.guild);
  if (!forumChannel) {
    await message.reply('ARTICLE_CHANNEL is missing or not a forum channel.');
    return;
  }

  let member = message.member;
  if (!member) {
    member = await message.guild.members.fetch(message.author.id).catch(() => null);
  }

  if (!canUserCreateArticle(member)) {
    await message.reply('You do not have permission to create articles.');
    return;
  }

  const { title, bodyTemplate } = parseArticleCommandInput(message);
  if (!title && !bodyTemplate) {
    await message.reply(ARTICLE_HELP_RESPONSE);
    return;
  }

  if (!title || !bodyTemplate) {
    await message.reply(`Usage: \`${message.client.prefix}article <title>\` then body text with Discord message links.`);
    return;
  }

  DISCORD_MESSAGE_LINK_REGEX.lastIndex = 0;
  const matches = Array.from(bodyTemplate.matchAll(DISCORD_MESSAGE_LINK_REGEX));
  if (matches.length === 0) {
    await message.reply('Include at least one Discord message link in the article body.');
    return;
  }

  const contributorMap = new Map();
  const linkedMessageIds = [];

  const callerProfile = await formatAuthorProfile(message);
  const authorProfile = {
    username: String(callerProfile?.username || 'Anonymous').trim() || 'Anonymous',
    image: String(callerProfile?.image || '')
  };

  const replacementByToken = new Map();
  const replacementByMessageId = new Map();

  for (const match of matches) {
    const rawToken = String(match[0]);
    const guildId = String(match[1]);
    const channelId = String(match[2]);
    const linkedMessageId = String(match[3]);

    if (replacementByMessageId.has(linkedMessageId)) {
      replacementByToken.set(rawToken, replacementByMessageId.get(linkedMessageId));
      continue;
    }

    let linkedMessage;
    try {
      linkedMessage = await fetchLinkedDiscordMessage(message, guildId, channelId, linkedMessageId);
    } catch (error) {
      await message.reply(error.message);
      return;
    }

    const linkedProfile = await formatAuthorProfile(linkedMessage);
    const linkedUsername = String(linkedProfile?.username || '').trim() || 'Anonymous';
    if (linkedUsername.toLowerCase() !== authorProfile.username.toLowerCase())
      addUniqueAuthor(contributorMap, linkedProfile);

    const linkedContent = collectLinkedMessageContent(linkedMessage);
    replacementByMessageId.set(linkedMessageId, linkedContent);
    replacementByToken.set(rawToken, linkedContent);
    linkedMessageIds.push(linkedMessageId);
  }

  let articleContent = bodyTemplate;
  for (const [rawToken, linkedContent] of replacementByToken.entries()) {
    articleContent = articleContent.split(rawToken).join(linkedContent);
  }

  if (!articleContent.trim()) {
    await message.reply('The assembled article content is empty. Add text content to the linked messages or body.');
    return;
  }

  const contributorProfiles = Array.from(contributorMap.entries()).map(([username, image]) => ({
    username,
    image
  }));

  const { created, article, error } = await createDraftArticle({
    title,
    content: articleContent,
    article_time: message.createdAt?.toISOString?.() ?? new Date().toISOString(),
    published: false,
    authors: [authorProfile],
    contributors: contributorProfiles,
    source_message_id: message.id,
    source_channel_id: message.channel.id,
    source_guild_id: message.guild.id,
    linked_message_ids: Array.from(new Set(linkedMessageIds))
  });

  if (!created || !article) {
    const retryHint = error && /status code 409|status code 422/i.test(error)
      ? ' The articles repo is busy; retry in a few seconds.'
      : '';
    const detail = error ? ` Error: ${error}` : '';
    await message.reply(`Unable to create the article draft right now.${retryHint}${detail}`);
    return;
  }

  const promotionEmoji = await resolvePromotionEmojiToken(message.guild);

  let thread;
  try {
    thread = await forumChannel.threads.create({
      name: title.slice(0, 100),
      message: {
        content: buildPreviewContent(article, promotionEmoji)
      }
    });
  } catch (error) {
    console.error('Error creating article forum post:', error);
    await message.reply(`Draft saved with id ${article.id}, but forum post creation failed.`);
    return;
  }

  const forumUrlUpdate = await setArticleForumPostUrl(article.id, thread.url);
  if (!forumUrlUpdate.updated) {
    const detail = forumUrlUpdate.error ? ` (${forumUrlUpdate.error})` : '';
    console.error(`Draft forum URL update failed for ${article.id}${detail}`);
  }

  const articleUrl = `https://btcmaxis.com/article.html?id=${article.id}`;
  await message.reply(`[Article Link](<${articleUrl}>) | [Article Comments](<${thread.url}>)`);
}

module.exports = {
  article: {
    execute: articleCommand
  }
};













