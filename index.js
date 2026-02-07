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

const APPLY_CHANNEL_ID = "1469158146500198645"; // заявки
const PROMO_CHANNEL_ID = "1469477344161959957"; // канал !повышение
const LOG_CHANNEL_ID   = "1469477344161959957"; // логи маккоинов

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const ADMIN_ROLE_NAME = "Hight";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";

const COINS_FILE = "./coins.json";

const WARN_REMOVE_PRICE = 10;
// ============================================



// ================= ВАЛЮТА =================
function loadCoins() {
  if (!fs.existsSync(COINS_FILE)) fs.writeFileSync(COINS_FILE, '{}');
  return JSON.parse(fs.readFileSync(COINS_FILE));
}

function saveCoins(data) {
  fs.writeFileSync(COINS_FILE, JSON.stringify(data, null, 2));
}

function getCoins(id) {
  const data = loadCoins();
  return data[id] || 0;
}

function addCoins(id, amount) {
  const data = loadCoins();
  if (!data[id]) data[id] = 0;
  data[id] += amount;
  if (data[id] < 0) data[id] = 0;
  saveCoins(data);
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
//                    КОМАНДЫ
// =================================================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ===== !заявка =====
  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription('👇 Нажми кнопку ниже, чтобы подать заявку');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    return message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== !повышение =====
  if (message.content === '!повышение' && message.channel.id === PROMO_CHANNEL_ID) {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('💎 Система маккоинов')
      .setDescription(`
🏆 **Начисления**
• Капт — 3
• Трасса — 2
• МП — 2
• Арена — 1
• Тайник — 2
`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('coins_request').setLabel('💰 Получить').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('coins_balance').setLabel('📊 Баланс').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('coins_shop').setLabel('🛒 Магазин').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('coins_add_admin').setLabel('➕ Выдать').setStyle(ButtonStyle.Danger)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});



// =================================================
//                    ИНТЕРАКЦИИ
// =================================================
client.on('interactionCreate', async interaction => {



  // =================================================
  //                    ЗАЯВКИ
  // =================================================

  if (interaction.isButton() && interaction.customId === 'apply') {

    const modal = new ModalBuilder()
      .setCustomId('applyModal')
      .setTitle('Заявка');

    const input = (id, label, style) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(true)
      );

    modal.addComponents(
      input('nick', 'Ник / Имя / Возраст', TextInputStyle.Short),
      input('online', 'Суточный онлайн и уровень', TextInputStyle.Short),
      input('fam', 'В каких семьях были?', TextInputStyle.Paragraph),
      input('where', 'Как узнал о семье?', TextInputStyle.Short),
      input('skills', 'Откат тяги / спешик', TextInputStyle.Paragraph)
    );

    return interaction.showModal(modal);
  }



  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    const channel = await interaction.guild.channels.fetch(APPLY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('📩 Новая заявка')
      .addFields(
        { name: '👤 Пользователь', value: `${interaction.user}` },
        { name: 'Ник / Имя / Возраст', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
        { name: 'Откат / спешик', value: interaction.fields.getTextInputValue('skills') }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`watch_${interaction.user.id}`).setLabel('👀 Смотрю').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel('📞 Обзвон').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: '✅ Заявка отправлена!', flags: MessageFlags.Ephemeral });
  }



  if (interaction.isButton() && interaction.customId.startsWith('watch_')) {
    return interaction.reply({ content: '👀 Вы взяли заявку', flags: MessageFlags.Ephemeral });
  }



  if (interaction.isButton() && interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    await member.send('📞 Вас вызывают на обзвон!');
    return interaction.reply({ content: '📞 Пользователь вызван', flags: MessageFlags.Ephemeral });
  }



  if (interaction.isButton() && interaction.customId.startsWith('accept_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const role1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
    const role2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

    if (role1) await member.roles.add(role1);
    if (role2) await member.roles.add(role2);

    await member.send('🎉 Заявка принята!');

    return interaction.update({ content: '✅ Принято', components: [] });
  }



  if (interaction.isButton() && interaction.customId.startsWith('reject_')) {

    const id = interaction.customId.split('_')[1];

    const modal = new ModalBuilder()
      .setCustomId(`rejectReason_${id}`)
      .setTitle('Причина отказа');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Укажите причину')
          .setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }



  if (interaction.isModalSubmit() && interaction.customId.startsWith('rejectReason_')) {

    const id = interaction.customId.split('_')[1];
    const reason = interaction.fields.getTextInputValue('reason');

    const member = await interaction.guild.members.fetch(id);
    await member.send(`❌ Заявка отклонена\nПричина: ${reason}`);

    return interaction.update({ content: `❌ Отклонено\nПричина: ${reason}`, components: [] });
  }



  // =================================================
  //                    МАККОИНЫ
  // =================================================

  if (interaction.isButton() && interaction.customId === 'coins_balance') {
    return interaction.reply({ content: `💰 Баланс: ${getCoins(interaction.user.id)}`, flags: MessageFlags.Ephemeral });
  }



  if (interaction.isButton() && interaction.customId === 'coins_shop') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('🛒 Магазин')
      .setDescription(`❌ Снять варн — ${WARN_REMOVE_PRICE} коинов`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('buy_warn').setLabel('Снять варн').setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
  }



  if (interaction.isButton() && interaction.customId === 'buy_warn') {

    if (getCoins(interaction.user.id) < WARN_REMOVE_PRICE)
      return interaction.reply({ content: '❌ Недостаточно коинов', flags: MessageFlags.Ephemeral });

    addCoins(interaction.user.id, -WARN_REMOVE_PRICE);

    return interaction.reply({ content: '✅ Варн снят', flags: MessageFlags.Ephemeral });
  }
});



client.login(TOKEN);
