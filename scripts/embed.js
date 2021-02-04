const config = require('../config.json');
const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

module.exports = async (server, title, description, foto, color) => {
    const embedsend = new Discord.MessageEmbed()
    .setTitle(title)
    .setDescription(description)
    .setThumbnail(foto)
    .setColor(color)
    server.send(embedsend);
}