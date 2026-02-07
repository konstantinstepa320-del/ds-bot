const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');

const fs = require('fs');


// ================= НАСТРОЙКИ =================
const TOKEN = process.env.TOKEN;

const APPLY_CHANNEL_ID = "1469158146500198645";
const LOG_CHANNEL_ID   = "1469477344161959957";

const ADMIN_ROLE_NAME = "Hight";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";

const COINS_FILE = "./coins.json";

const WARN_REMOVE_PRICE = 70;
// ============================================



// ================= БАЗА =================
function load() {
  if (!fs.existsSync(COINS_FILE)) fs.writeFileSync(COINS_FILE, '{}');
  return JSON.parse(fs.readFileSync(COINS_FILE));
}

function save(data) {
  fs.writeFileSync(COINS_FILE, JSON.stringify(data, null, 2));
}

function getCoins(id) {
  const db = load();
  return db[id]?.coins || 0;
}

function addCoins(id, amount) {
  const db = load();
  if (!db[id]) db[id] = { coins: 0, disabled: false };
  db[id].coins += amount;
  if (db[id].coins < 0) db[id].coins = 0;
  save(db);
}

function isDisabled(id){
  const db = load();
  return db[id]?.disabled;
}

function disableUser(id){
  const db = load();
  if (!db[id]) db[id] = { coins: 0 };
  db[id].disabled = true;
  save(db);
}
// ============================================



const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});



client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});



// =================================================
//                     !ПОВЫШЕНИЕ
// =================================================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '!повышение') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('💎 Маккоины')
      .setDescription(`
• Отправляешь скрин + ссылку  
• Админ проверяет  
• Получаешь балы

Снятие варна — **70**
`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('request').setLabel('💰 Получить').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('balance').setLabel('📊 Баланс').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop').setLabel('🛒 Магазин').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('give_admin').setLabel('➕ Выдать').setStyle(ButtonStyle.Danger)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});



// =================================================
//                    ИНТЕРАКЦИИ
// =================================================
client.on('interactionCreate', async interaction => {

  // ================= БАЛАНС =================
  if (interaction.isButton() && interaction.customId === 'balance') {
    return interaction.reply({
      content: `💰 У тебя: ${getCoins(interaction.user.id)} балов`,
      flags: MessageFlags.Ephemeral
    });
  }



  // ================= МАГАЗИН =================
  if (interaction.isButton() && interaction.customId === 'shop') {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('buy_warn')
        .setLabel('Снять варн (70)')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
  }



  if (interaction.isButton() && interaction.customId === 'buy_warn') {

    if (getCoins(interaction.user.id) < WARN_REMOVE_PRICE)
      return interaction.reply({ content: '❌ Недостаточно балов', flags: MessageFlags.Ephemeral });

    addCoins(interaction.user.id, -WARN_REMOVE_PRICE);

    return interaction.reply({ content: '✅ Варн снят', flags: MessageFlags.Ephemeral });
  }



  // ================= ЗАПРОС БАЛОВ =================
  if (interaction.isButton() && interaction.customId === 'request') {

    if (isDisabled(interaction.user.id))
      return interaction.reply({ content: '❌ Ты отключен от системы', flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder()
      .setCustomId('coinsModal')
      .setTitle('Отправка доказательств');

    const input = (id, label) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      );

    modal.addComponents(
      input('proof', 'Ссылка + скрин'),
      input('amount', 'Сколько балов выдать?')
    );

    return interaction.showModal(modal);
  }



  if (interaction.isModalSubmit() && interaction.customId === 'coinsModal') {

    const proof = interaction.fields.getTextInputValue('proof');
    const amount = interaction.fields.getTextInputValue('amount');

    const log = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('📥 Запрос на балы')
      .addFields(
        { name: 'Игрок', value: `${interaction.user}` },
        { name: 'Сколько', value: amount },
        { name: 'Доказательства', value: proof }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`approve_${interaction.user.id}_${amount}`).setLabel('✅ Одобрить').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`disable_${interaction.user.id}`).setLabel('🔒 Отключить').setStyle(ButtonStyle.Secondary)
    );

    await log.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: '✅ Отправлено на проверку', flags: MessageFlags.Ephemeral });
  }



  // ================= ОДОБРИТЬ =================
  if (interaction.isButton() && interaction.customId.startsWith('approve_')) {

    const [, id, amount] = interaction.customId.split('_');

    addCoins(id, Number(amount));

    const member = await interaction.guild.members.fetch(id);
    await member.send(`✅ Тебе начислено ${amount} балов\nБаланс: ${getCoins(id)}`);

    return interaction.update({ content: `✅ Выдано ${amount}`, components: [] });
  }



  // ================= ОТКЛОНИТЬ =================
  if (interaction.isButton() && interaction.customId.startsWith('deny_')) {

    const id = interaction.customId.split('_')[1];

    const modal = new ModalBuilder()
      .setCustomId(`denyReason_${id}`)
      .setTitle('Причина отказа');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Причина')
          .setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }



  if (interaction.isModalSubmit() && interaction.customId.startsWith('denyReason_')) {

    const id = interaction.customId.split('_')[1];
    const reason = interaction.fields.getTextInputValue('reason');

    const member = await interaction.guild.members.fetch(id);
    await member.send(`❌ Отказ\nПричина: ${reason}`);

    return interaction.update({ content: `❌ Отклонено`, components: [] });
  }



  // ================= ОТКЛЮЧИТЬ =================
  if (interaction.isButton() && interaction.customId.startsWith('disable_')) {

    const id = interaction.customId.split('_')[1];

    disableUser(id);

    const member = await interaction.guild.members.fetch(id);
    await member.send('🔒 Ты отключен от системы балов');

    return interaction.update({ content: '🔒 Отключен', components: [] });
  }



  // ================= ВЫДАТЬ АДМИН =================
  if (interaction.isButton() && interaction.customId === 'give_admin') {

    if (!interaction.member.roles.cache.some(r => r.name === ADMIN_ROLE_NAME))
      return interaction.reply({ content: '❌ Нет прав', flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder()
      .setCustomId('adminGive')
      .setTitle('Выдать балы');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('user').setLabel('ID или @mention').setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('amount').setLabel('Количество').setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }



  if (interaction.isModalSubmit() && interaction.customId === 'adminGive') {

    const id = interaction.fields.getTextInputValue('user').replace(/[<@!>]/g,'');
    const amount = Number(interaction.fields.getTextInputValue('amount'));

    addCoins(id, amount);

    const member = await interaction.guild.members.fetch(id);
    await member.send(`💎 Админ выдал тебе ${amount}\nБаланс: ${getCoins(id)}`);

    return interaction.reply({ content: '✅ Выдано', flags: MessageFlags.Ephemeral });
  }

});



client.login(TOKEN);