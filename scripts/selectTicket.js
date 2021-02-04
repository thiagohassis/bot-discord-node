const config = require('../config.json');
const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const tickets = require('./tickets.json');

module.exports = async (reaction, user) => {
    let channel = reaction.message.channel
    channel.guild.channels.create(`selecione`, {
        type: 'text',
        parent: config.ticketSelectCategory,
        permissionOverwrites: [
            {
                id: channel.guild.id,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: user.id,
                allow: ['VIEW_CHANNEL'],
            },
        ],
    }).then( async channel => {
        let options = [];
        for (i = 0; i < tickets.length; i++) {
            options[i] = { name: `${i + 1} - ${tickets[i].name}`, value: `${tickets[i].description}` }
        }
        
        let time = new Date();
        const selectEmbed = new Discord.MessageEmbed()
        .setTitle(`Seleção de Atendimento`)
        .setDescription('Digite o número de uma das opções a baixo:')
        .addFields(
            { name: '\u200B', value: '\u200B', inline: true },
            options
        )
        .setColor('#EAF817')
        .setFooter(`${time.getDate()}/${time.getMonth()+1}/${time.getFullYear()}`);
        channel.send(`${user} Selecione o atendimento:`)
        let selectEmbedMessage = await channel.send(selectEmbed);
    });
}