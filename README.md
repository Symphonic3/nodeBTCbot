# nodeBTCbot
 A modern node.js bot for the bitcoin discord
# Usage
 1. Install node v20 or higher & clone the repository
 2. Setup your `.env` based on the example of `example.env`
 3. Run `npm install`
 4. Run `node --env-file=.env index.js`

# Discord Gateway intents

In the Discord Developer Portal, open your application's **Bot** page and configure **Privileged Gateway Intents**:

- **Server Members Intent**: enabled for member joins, role/nickname updates, and moderation tracking.
- **Message Content Intent**: enabled for prefix commands, message moderation, and articles.
- **Presence Intent**: disabled; the bot does not read members' online status or activities.

The client explicitly requests guild, member, moderation, emoji, guild-message, guild-reaction, direct-message, and message-content events/data. Only Server Members and Message Content are privileged. The bot's own Bitcoin-price status display does not require Presence Intent and remains enabled.

These are Gateway event subscriptions, separate from the bot's server/channel permissions. Restart the bot after deploying the code change. See [Discord's Gateway intent documentation](https://docs.discord.com/developers/events/gateway#gateway-intents).

The bot does not assume the startup member cache is complete. CAPTCHA verification, starboarding, and history-based bans fetch individual members as needed without requesting presences. Temporary nicknames are enforced from saved restrictions. Timeout logging uses audit-log events (`GuildModeration` plus the existing **View Audit Log** server permission), so it does not need a cached before-state for members.

# Contributing

**If you feel like contributing but don't know what to add, take a look at TODO.md.**

 - Note that all module.exports from any file in `commands/` will automatically be registered as commands
 - Extract logic where some data is being provided or manipulated to `services/` where possible
 - Try to seperate commands into their own files as much as possible, but group related ones if it makes sense
 - Some portions of this are LLM slop, so there's definitely some stupid code. Feel free to refactor!
 - Please leave an issue if you come upon something that needs fixing but you don't want to fix it
