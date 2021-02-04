const config = require('../config.json');
const Discord = require('discord.js');
const { con } = require('../database');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const tickets = require('./tickets.json');

module.exports = async (message, number) => {
    let zerocomplete
    let channelnumber = 0;
    let member = await message.guild.members.fetch(message.author.id);

    await con.query(`SELECT * FROM tickets`, function (err, result) {
        if (err) throw err;
        channelnumber = result.length + 1;

        let status = 'jogador';

        if(member.roles.cache.has(config.vipRoleDiamanteID))
            status = 'VIP Diamante';  
        else if(member.roles.cache.has(config.vipRoleOuroID))
            status = 'VIP Ouro';
        else if(member.roles.cache.has(config.vipRolePrataID))
            status = 'VIP Prata';
        else if(member.roles.cache.has(config.vipRoleBronzeID))
            status = 'VIP Bronze';

        if(channelnumber > 999) {
            zerocomplete = '';
        } else if(channelnumber > 99) {
            zerocomplete = '0';
        } else if(channelnumber > 9) {
            zerocomplete = '00';
        } else {
            zerocomplete = '000';
        }

        message.guild.channels.create(`aberto-${tickets[number].TAG}-${zerocomplete}${channelnumber}`, {
            type: 'text',
            parent: config.ticketCategory,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: message.author.id,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: config.suporteTagID,
                    allow: ['VIEW_CHANNEL'],
                },
            ],
        }).then( channel => {
            let time = new Date();
            let expiredate = time.getTime() + 3 * 24 * 60 * 60 * 1000
            con.query(`INSERT INTO tickets (name, owner, channel, expire) VALUES ('aberto-${tickets[number].TAG}-${zerocomplete}${channelnumber}', '${message.author.id}', '${channel.id}', '${expiredate}')`, function (err, result) {if (err) throw err;});
            const ticketEmbed = new Discord.MessageEmbed()
            .setTitle(`Atendimento Nº${zerocomplete}${channelnumber}`)
            .addFields(
                { name: 'Categoria:', value: `>>> ${tickets[number].name}`},
                { name: 'Tipo:', value: `>>> ${status}`},
                { name: 'Criado Por:', value: `>>> ${message.author}` },
            )
            .setColor('#EAF817')
            .setFooter(`${time.getDate()}/${time.getMonth()+1}/${time.getFullYear()}`);
            channel.send(ticketEmbed);
            channel.send(`${message.author} **Aguarde até que um dos nosso atendentes assuma o ticket!**`)
        });
    });
}