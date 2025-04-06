# nodeBTCbot
 A modern node.js bot for the bitcoin discord
# Usage
 1. Install node v20 or higher & clone the repository
 2. Setup your `.env` based on the example of `example.env`
 3. Run `npm install`
 4. Run `node --env-file=.env index.js`
# Notes for contributors
 - Note that all module.exports from any file in `commands/` will automatically be registered as commands
 - Extract logic where some data is being provided or manipulated to `services/` where possible
 - Try to seperate commands into their own files as much as possible, but group related ones if it makes sense
 - Some portions of this aren't written by a human, so there's definitely some stupid code. Feel free to refactor!
 - Please leave an issue if you come upon something that needs fixing but you don't want to fix it