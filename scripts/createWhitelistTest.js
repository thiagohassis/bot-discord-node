const config = require('../config.json');
const Discord = require('discord.js');
const { con } = require('../database');
const _ = require('underscore');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

module.exports = async (reaction, user) => {
    let channel = reaction.message.channel
    function randomString(length, chars) {
        var mask = '';
        if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
        if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (chars.indexOf('#') > -1) mask += '0123456789';
        if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
        var result = '';
        for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
        return result;
    }

    let channelRandomName = randomString(7, 'aA#');

    channel.guild.channels.create(`whitelist-${channelRandomName}`, {
        type: 'text',
        parent: config.whitelistCategory,
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
        let time = new Date();
        let expiredate = time.getTime() + 1 * 24 * 60 * 60 * 1000
        con.query(`INSERT INTO channels (owner, channel, expire) VALUES (${user.id}, ${channel.id}, ${expiredate})`, function (err, result) {
            if (err) throw err;
        });
        const whitelistwelcome = new Discord.MessageEmbed()
        .setTitle(`Questionário de Whitelist`)
        .addFields(
            { name: 'Como Funciona?', value: `>>> Leia atentamente as perguntas e responda conforme o número da questão, caso você seja aprovado a whitelist é entregue automáticamente.`},
            { name: 'Tentativas Máximas:', value: `>>> ${config.whitelistMaxAttemps}` },
            { name: 'Numero Máximo de Erros:', value: `>>> ${config.whitelistMaxErros}` },
            { name: 'Tempo:', value: `>>> ${config.whitelistTime / 60000} minuto por questão` },
        )
        .setColor('#EAF817')
        .setFooter(`${time.getDate()}/${time.getMonth()+1}/${time.getFullYear()}`);
        let welcomemessage = await channel.send(whitelistwelcome);
        let start = await channel.send(`${user} Clique para **iniciar** a prova!`);
        start.react('✅');

        const filter = (reaction, user) => {
            return reaction.emoji.name == '✅' && user.bot == false;
        };
        
        const collector = start.createReactionCollector(filter, { time: config.whitelistTime });

        collector.on('collect', (reaction, user) => {
            start.delete();
            welcomemessage.delete();

            sendembed(reaction, user);
        });
    });

    async function sendembed(reaction, user) {
        let channel = reaction.message.channel

        if (typeof(reaction.message.channel.hits) == 'undefined') {
            reaction.message.channel.hits = 0
            reaction.message.channel.errors = 0
        }

        if (typeof(reaction.message.channel.questions) == 'undefined') {
            reaction.message.channel.questions = 0
        }

        const quiz = require('./quiz.json');
        const item = quiz;
        if (reaction.message.channel.questions >=  13) {
            if (reaction.message.channel.errors > config.whitelistMaxErros) {
                channel.send(`${user} Questionário Finalizado!`);
                channel.send(`${user} Você foi **negado** no teste, leia as regras e tente novamente!`);
                con.query(`DELETE FROM channels WHERE channel = ${channel.id}`, function (err, result) {
                    if (err) throw err;
                });
                setTimeout( () => { channel.delete(); }, 20000);
            } else {
                channel.send(`${user} Questionário Finalizado!`);
                channel.send(`${user} Parabéns, você foi aprovado no questionário e já pode entrar no servidor!`);
                let member = await reaction.message.guild.members.fetch(user.id);
                member.roles.add(config.whitelistRoleID)
                if (reaction.message.channel.errors == 0) {
                    channel.send(`${user} Uau, você não cometeu nenhum erro!`);
                }
                con.query(`DELETE FROM channels WHERE channel = ${channel.id}`, function (err, result) {
                    if (err) throw err;
                });
                setTimeout( () => { channel.delete(); }, 20000);
            }
        } else {
            const filter = response => {
                return response.content == 1 || response.content == 2 || response.content == 3 || response.content == 4;
            };
            const questionembed = new Discord.MessageEmbed()
            .setTitle(item[reaction.message.channel.questions].question)
            .addFields(
                { name: '1 - ' + item[reaction.message.channel.questions].answers[0], value: 'Responda digitando o número no chat' },
                { name: '2 - ' + item[reaction.message.channel.questions].answers[1], value: 'Responda digitando o número no chat' },
                { name: '3 - ' + item[reaction.message.channel.questions].answers[2], value: 'Responda digitando o número no chat' },
                { name: '4 - ' + item[reaction.message.channel.questions].answers[3], value: 'Responda digitando o número no chat' },
            )
            .setColor('#EAF817')
            let question = await channel.send(questionembed).then(() => {
                channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })
                    .then(collected => {
                        if(collected.first().content == item[reaction.message.channel.questions].correct) {
                            reaction.message.channel.questions++;
                            reaction.message.channel.hits++;
                            sendembed(reaction, user);
                        } else {
                            reaction.message.channel.questions++;
                            reaction.message.channel.errors++;
                            sendembed(reaction, user)
                        }
                    })
                    .catch(collected => {
                        reaction.message.channel.questions++;
                        reaction.message.channel.errors++;
                        channel.send(` ${user} Você demorou muito para responder, questão anulada!`);
                        sendembed(reaction, user)
                    });
            });
        }
    }
};

function shuffle(array) {
    for(var i = array.length; i > 1; i--) {
        var r = Math.floor(Math.random() * i);
        var temp = array[r];
        array[r] = array[i-1];
        array[i-1] = temp;
      }
    return array;
}