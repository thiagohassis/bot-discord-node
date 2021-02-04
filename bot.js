const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const config = require('./config.json');

const database = require('./database');
const { con, server } = require('./database');

const jimp = require('jimp');

const createWhitelistTest = require('./scripts/createWhitelistTest');
const selectTicket = require('./scripts/selectTicket');
const createTicket = require('./scripts/createTicket');
const embed = require('./scripts/embed');
const tickets = require('./scripts/tickets.json');

//Verificar a data de validade dos tickets
async function verifyticket() {
    setInterval(() => {
        let date = new Date().getTime()
        
        client.channels.cache.forEach(async channel => {
            if(channel.name.includes("fechado")) {
                if(channel.parentID == config.ticketCategory) {
                    con.query(`SELECT * FROM tickets WHERE channel = ${channel.id}`, function (err, result, fields) {
                        if(result[0].expire < date) {
                            channel.delete();
                            con.query(`UPDATE tickets SET status = 'deletado' WHERE channel = '${channel.id}'`, function (err, result) {if (err) throw err;});
                        }
                    });
                }
            } else if(channel.name.includes("assumido")) {
                if(channel.parentID == config.ticketCategory) {
                    con.query(`SELECT * FROM tickets WHERE channel = ${channel.id}`, function (err, result, fields) {
                    channel.setName(`fechado ${channel.name.replace('aberto-', '').replace('assumido-', '')}`);
                        setTimeout(() => {
                            if(channel.name.includes("fechado")) {
                                if(result[0].expire < date) {
                                    let expiredate = new Date().getTime() + 3 * 24 * 60 * 60 * 1000
                                    embed(channel, 'Ticket Fechado!', `O ticket foi **fechado** automáticamente`, 'https://imgur.com/zANSIqH.png', '#F81717');
                                    channel.updateOverwrite(channel.guild.roles.everyone, { SEND_MESSAGES: false });
                                    con.query(`UPDATE tickets SET expire = ${expiredate}, status = 'fechado' WHERE channel = '${channel.id}'`, function (err, result) {if (err) throw err;});
                                    channel.send('**Caso continue fechado, será removido em 3 dias!**');
                                }
                            }
                        }, 1000)
                    });
                }
            }
        });
    }, 5 * 60000);
};

//Apagar a sala de whitelist depois de 1 dia
async function verifywhitelist() {
    setInterval(() => {
        let date = new Date().getTime()
        
        client.channels.cache.forEach(async channel => {
            if(channel.name.includes("whitelist")) {
                if(channel.parentID == config.whitelistCategory) {
                    con.query(`SELECT * FROM channels WHERE channel = ${channel.id}`, function (err, result, fields) {
                        if(result[0].expire < date) {
                            channel.delete();
                            con.query(`DELETE FROM channels WHERE channel = '${channel.id}'`, function (err, result) {if (err) throw err;});
                        }
                    });
                }
            }
        });
    }, 5 * 60000);
};

//Verificar jogadores que são VIP e não tem tag no discord para adicionar
async function verifyVIP() {
    setInterval(async () => {
        server.query("SELECT * FROM vip", function (err, result, fields) {
            if (err) throw err;
            result.forEach(async result => {
                let guild = await client.guilds.fetch(config.guildID, { cache: true });
                let user = await guild.members.fetch(result.discord, { cache: true });
                if(user) {
                    let hasVIPRole = false;
                    
                    if(user.roles.cache.get(config.vipRoleDiamanteID)) 
                        hasVIPRole = true
                    else if(user.roles.cache.get(config.vipRoleOuroID)) 
                        hasVIPRole = true;
                    else if(user.roles.cache.get(config.vipRolePrataID)) 
                        hasVIPRole = true;
                    else if(user.roles.cache.get(config.vipRoleBronzeID)) 
                        hasVIPRole = true;
                    

                    if(!hasVIPRole) {
                        let VIPType = result.nivel

                        if(VIPType == "DIAMANTE") 
                            user.roles.add(config.vipRoleDiamanteID);
                        else if(VIPType == "OURO") 
                            user.roles.add(config.vipRoleOuroID);
                        else if(VIPType == "PRATA") 
                            user.roles.add(config.vipRolePrataID);
                        else if(VIPType == "BRONZE") 
                            user.roles.add(config.vipRoleBronzeID);
                    }
                }
            })
        });
    }, 5 * 60000);
};

//Verificar jogadores que tem a tag mas não são VIP para remover
async function verifyTag() {
    setInterval(async () => {
        let guild = await client.guilds.fetch(config.guildID, { cache: true });
        let VIPDiamanteUsers = await (await guild.roles.fetch(config.vipRoleDiamanteID)).members.array();
        let VIPOuroUsers = await (await guild.roles.fetch(config.vipRoleOuroID)).members.array();
        let VIPPrataUsers = await (await guild.roles.fetch(config.vipRolePrataID)).members.array();
        let VIPBronzeUsers = await (await guild.roles.fetch(config.vipRoleBronzeID)).members.array();
        
        VIPDiamanteUsers.forEach(async res => {
            server.query(`SELECT * FROM vip WHERE discord = ${res.id}`, async function (err, result, fields) {
                if(result.length == 0) {
                    let user = await guild.members.fetch(res, { cache: true });
                    user.roles.remove(config.vipRoleDiamanteID);
                }
            });
        });

        VIPOuroUsers.forEach(async res => {
            server.query(`SELECT * FROM vip WHERE discord = ${res.id}`, async function (err, result, fields) {
                if(result.length == 0) {
                    let user = await guild.members.fetch(res, { cache: true });
                    user.roles.remove(config.vipRoleOuroID);
                }
            });
        });

        VIPPrataUsers.forEach(async res => {
            server.query(`SELECT * FROM vip WHERE discord = ${res.id}`, async function (err, result, fields) {
                if(result.length == 0) {
                    let user = await guild.members.fetch(res, { cache: true });
                    user.roles.remove(config.vipRolePrataID);
                }
            });
        });

        VIPBronzeUsers.forEach(async res => {
            server.query(`SELECT * FROM vip WHERE discord = ${res.id}`, async function (err, result, fields) {
                if(result.length == 0) {
                    let user = await guild.members.fetch(res, { cache: true });
                    user.roles.remove(config.vipRoleBronzeID);
                }
            });
        });
    }, 5 * 60000);
};

client.on("ready", async () => {
    verifyticket();
    verifywhitelist();
    verifyVIP();
    verifyTag()
});

client.on("ready", async () => {
    console.log(`BOT iniciado com sucesso!`);
    client.user.setPresence({ game: {name: config.botName}, status: 'online'});
    client.user.setActivity(config.botDescription);
    client.user.setUsername(config.botName);

    let channelw = client.channels.cache.get(config.whitelistchannel);
    channelw.messages.fetch({ limit: 1 }).then(async messages => {
        let lastMessage = messages.first();
        if(lastMessage) {
            if(lastMessage.content !== config.whitelistMessage) {
                await channelw.send(config.whitelistMessage);
                channelw.messages.fetch({ limit: 1 }).then(messages => {
                    let lastMessage = messages.first();
                
                    lastMessage.react('📩');
                
                })
            }
        } else {
            await channelw.send(config.whitelistMessage);
            channelw.messages.fetch({ limit: 1 }).then(messages => {
                let lastMessage = messages.first();
            
                lastMessage.react('📩');
            
            }) 
        }
    });

    let channelt = client.channels.cache.get(config.ticketChannel);
    channelt.messages.fetch({ limit: 1 }).then(async messages => {
        let lastMessage = messages.first();
        if(lastMessage) {
            if(lastMessage.content !== config.ticketMessage) {
                await channelt.send(config.ticketMessage);
                channelt.messages.fetch({ limit: 1 }).then(messages => {
                    let lastMessage = messages.first();
                
                    lastMessage.react('📩');
                
                })
            }
        } else {
            await channelt.send(config.ticketMessage);
            channelt.messages.fetch({ limit: 1 }).then(messages => {
                let lastMessage = messages.first();
            
                lastMessage.react('📩');
            
            }) 
        }
    })
});

//IMAGEM DE BOAS VINDAS AO SERVIDOR
client.on("guildMemberAdd", async member => {
    let font = await jimp.loadFont(jimp.FONT_SANS_32_BLACK);
    let mask = await jimp.read('img/mascara.png');
    let fundo = await jimp.read('img/fundo.png');
    let channel = client.channels.cache.get(config.welcomeChannel);
    let channelwhitelist = client.channels.cache.get(config.whitelistchannel);
    jimp.read(member.user.displayAvatarURL().replace(".webp", ".png")).then(avatar => {
        avatar.resize(130, 130);
        mask.resize(130, 130);
        avatar.mask(mask);
        fundo.print(font, 180, 183, member.user.username);
        fundo.composite(avatar, 40, 90).write('welcome.png');
        channel.send(`${member.user} **Faça a whitelist automática na sala ${channelwhitelist}.**`, {files: ["welcome.png"]});
    })
    .catch(err => {
        console.log('erro ao carregar imagem '+err);
    });
})

//RECOLHIMENTO DE MENSAGENS
client.on("message", async message => {
    if(message.author.bot) return;

    //SALA DE SUGESTÕES
    if(message.channel.name.includes("sugestões") || message.channel.name.includes("sugestoes") || message.channel.name.includes("ideias") || message.channel.name.includes("sugestão") || message.channel.name.includes("sugestao")) {
        message.delete();
        let time = new Date();
        const sugestembed = new Discord.MessageEmbed()
        .setTitle(`Nova Sugestão Enviada!`)
        .addFields(
            { name: 'Sugestão:', value: `>>> ${message.content}`},
            { name: 'Enviada por:', value: `>>> ${message.author}` },
        )
        .setColor('#EDF31A')
        .setThumbnail('https://i.imgur.com/LQJxOIk.png')
        .setFooter(`${time.getDate()}/${time.getMonth()+1}/${time.getFullYear()}`);
        let sugest = await message.channel.send(sugestembed);
        sugest.react('✅');
        sugest.react('❌');
    // SALA DE SELEÇÃO DE TICKET
    } else if (message.channel.parentID == config.ticketSelectCategory) {
        if(message.content > 0 && message.content <= tickets.length) {
            createTicket(message, message.content - 1);
            message.channel.delete();
        } else {
            message.channel.send(`${message.author} Responda com o número da opção!`)
        }
    } else if (message.channel.parentID == config.ticketCategory) {
        con.query(`UPDATE tickets SET expire = ${expiredate} WHERE channel = '${message.channel.id}'`, function (err, result) {if (err) throw err;});
        if(message.content == '!fechar') {
            if(message.channel.name.includes("fechado")) {
                message.channel.send(`${message.author} O ticket já está fechado!`);
                message.delete();
            } else {
                message.channel.setName(`fechado ${message.channel.name.replace('aberto-', '').replace('assumido-', '')}`);
                setTimeout(() => {
                    if(message.channel.name.includes("fechado")) {
                        let expiredate = new Date().getTime() + 3 * 24 * 60 * 60 * 1000
                        message.delete();
                        embed(message.channel, 'Ticket Fechado!', `O ticket foi **fechado** por ${message.author}`, 'https://imgur.com/zANSIqH.png', '#F81717');
                        message.channel.updateOverwrite(message.channel.guild.roles.everyone, { SEND_MESSAGES: false });
                        con.query(`UPDATE tickets SET expire = ${expiredate}, status = 'fechado' WHERE channel = '${message.channel.id}'`, function (err, result) {if (err) throw err;});
                        message.channel.send('**Caso continue fechado, será removido em 3 dias!**')
                    } else {
                        message.delete();
                    }
                }, 1000)
            }
        } else if(message.content == '!assumir' && message.member.roles.cache.has(config.suporteTagID) == true) {
            if (message.channel.name.includes("fechado")) {
                message.channel.send(`${message.author} É necessário abrir o ticket antes de assumir!`);
                message.delete();
            } else {
                message.channel.setName(`assumido ${message.channel.name.replace('aberto-', '').replace('fechado-', '')}`);
                setTimeout(() => {
                    if(message.channel.name.includes("assumido")) {
                        let expiredate = new Date().getTime() + 3 * 24 * 60 * 60 * 1000
                        message.delete();
                        embed(message.channel, 'Ticket em Progresso!', `O ticket foi **assumido** por ${message.author}`, 'https://imgur.com/WXJPpIO.png', '#1754F8');
                        con.query(`UPDATE tickets SET expire = ${expiredate}, status = 'em-progresso' WHERE channel = '${message.channel.id}'`, function (err, result) {if (err) throw err;});
                    } else {
                        message.delete();
                    }
                }, 1000)
            }
        } else if(message.content == '!abrir' && message.member.roles.cache.has(config.suporteTagID) == true) {
            if(message.channel.name.includes("aberto")) {
                message.channel.send(`${message.author} O ticket já está aberto!`);
                message.delete();
            }else {
                message.channel.setName(`aberto ${message.channel.name.replace('fechado-', '').replace('assumido-', '')}`);
                setTimeout(() => {
                    if(message.channel.name.includes("aberto")) {
                        let expiredate = new Date().getTime() + 3 * 24 * 60 * 60 * 1000
                        message.delete();
                        embed(message.channel, 'Ticket Aberto!', `O ticket foi **aberto** por ${message.author}`, 'https://imgur.com/eywMhIp.png', '#17F832');
                        message.channel.updateOverwrite(message.channel.guild.roles.everyone, { SEND_MESSAGES: true });
                        con.query(`UPDATE tickets SET expire = ${expiredate}, status = 'aberto' WHERE channel = '${message.channel.id}'`, function (err, result) {if (err) throw err;});
                        console.log(message.channel.id)
                    } else {
                        message.delete();
                    }
                }, 1000)
            }
        } else if(message.content.startsWith('!transferir') && message.member.roles.cache.has(config.suporteTagID) == true) {
            if(message.channel.name.includes("aberto") || message.channel.name.includes("assumido")) {
                embed(message.channel, 'Ticket Transferido!', `O ticket foi **transferido** por ${message.author}`, 'https://i.imgur.com/fmUhVVe.png', '#F8C517');
                let mentions = message.mentions.users.map((item) => {
                    message.channel.send(`${item}`);
                });
                message.delete();
            } else {
                message.channel.send(`${message.author} É necessário que o ticket esteja aberto para poder transferir!`);
                message.delete();
            }
        } else if(message.content == '!apagar' && message.member.roles.cache.has(config.suporteTagID) == true) {
            if(message.channel.name.includes("aberto")) {
                message.channel.send(`${message.author} É necessário fechar o ticket antes de apagar!`);
                message.delete();
            } else {
                await ticket.deleteOne({ channel: `${message.channel}` }, function (err) {});
                message.delete();
                message.channel.delete();
            }
        }
    }
})

//RECOLHIMENTO DAS REAÇÕES
client.on("messageReactionAdd", async (reaction, user) => {
    if(user.bot) return;

    //WHITELIST
    if(reaction.message.channel.id == config.whitelistchannel) {
        if(reaction._emoji.name == '📩') {
            let member = await reaction.message.guild.members.fetch(user.id);
            reaction.message.reactions.resolve('📩').users.remove(user.id);
            if(member.roles.cache.has(config.whitelistRoleID)) {
                user.send(`${user} você já tem whitelist no servidor, não é necessário fazer outra vez.`)
            } else {
                con.query(`SELECT * FROM whitelisted WHERE owner = ${user.id}`, function (err, result, fields) {
                    if (err) throw err;
                    if(!result.length) {
                        con.query(`SELECT * FROM channels WHERE owner = ${user.id}`, function (err, result, fields) {
                            if(!result.length) {
                                con.query(`INSERT INTO whitelisted (owner, attempt) VALUES (${user.id}, 1)`, function (err, result) {
                                    if (err) throw err;
                                });
                                createWhitelistTest(reaction, user);
                            } else {
                                user.send(`${user} você só pode fazer uma whitelist por vez.`)
                            }
                        });
                    } else {        
                        if(result[0].owner == user.id) {
                            if(result[0].attempt >= 3) {
                                user.send(`${user} você já tem o número máximo de tentativas, entre em contato com o administração.`)
                            } else {
                                con.query(`SELECT * FROM channels WHERE owner = ${user.id}`, function (err, result, fields) {
                                    if(!result.length) {
                                        con.query(`UPDATE whitelisted SET attempt = attempt + 1 WHERE owner = ${user.id}`, function (err, result) {
                                            if (err) throw err;
                                        });
                                        createWhitelistTest(reaction, user);
                                    } else {
                                        user.send(`${user} você só pode fazer uma whitelist por vez.`)
                                    }
                                });
                            }
                        }
                    }
                });
            }
        }
    //TICKET
    } else if(reaction.message.channel.id == config.ticketChannel) {
        if(reaction._emoji.name == '📩') {
            let member = await reaction.message.guild.members.fetch(user.id);
            reaction.message.reactions.resolve('📩').users.remove(user.id);
            con.query(`SELECT * FROM tickets WHERE owner = ${user.id} AND status = 'aberto'`, function (err, result, fields) {
                if (err) throw err;
                if(!result.length) {
                    selectTicket(reaction, user);
                } else {
                    if(member.roles.cache.has(config.whitelistRoleID)) {
                        if(result[0].owner == user.id) {
                            if(result.length <= config.ticketMax) {
                                user.send(`${user} você atingiu o número máximo de tickets.`)
                            } else {
                                selectTicket(reaction, user);
                            }
                        } 
                    } else {
                        if(result[0].owner == user.id) {
                            if(result.length <= config.ticketMaxVip) {
                                selectTicket(reaction, user);
                            } else {
                                user.send(`${user} você atingiu o número máximo de tickets.`)
                            }
                        }
                    }
                }
            });
        }
    }
});


client.login(config.token);