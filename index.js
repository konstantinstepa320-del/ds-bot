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

const APPLY_CHANNEL_ID = "1469158146500198645";
const LOG_CHANNEL_ID = "1469477344161959957";

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";

const SCORES = {
  drop: 3,
  top1: 1,
  mp: 4,
  capt: 4,
  race: 2
};

// ================= JSON БД =================

const DB_FILE = "./coins.json";

let db = fs.existsSync(DB_FILE)
  ? JSON.parse(fs.readFileSync(DB_FILE))
  : {};

function addCoins(id, amount) {
  db[id] = (db[id] || 0) + amount;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getCoins(id) {
  return db[id] || 0;
}


// ================= БОТ =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});


// ================= READY =================
client.once('clientReady', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= КОМАНДЫ =================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ===== ЗАЯВКА =====
  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription('👇 Нажми кнопку ниже');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    return message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== ПОВЫШЕНИЕ =====
  if (message.content === '!повышение') {

    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setImage(IMAGE_URL)
      .setTitle('🪙 Система повышения')
      .setDescription(
`Дроп — 3
Топ 1 — 1
МП — 4
Капт — 4
Трасса — 2`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu').setLabel('📋 Меню').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('balance').setLabel('💰 Баланс').setStyle(ButtonStyle.Secondary)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});


// ================= ИНТЕРАКЦИИ =================
client.on('interactionCreate', async interaction => {

  // ---------- ЗАЯВКА КНОПКА ----------
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


  // ---------- ОТПРАВКА ЗАЯВКИ ----------
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = await interaction.guild.channels.fetch(APPLY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('📩 Новая заявка')
      .addFields(
        { name: '👤 Пользователь', value: `${interaction.user}` },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
        { name: 'Навыки', value: interaction.fields.getTextInputValue('skills') }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply({ content: '✅ Заявка отправлена!' });
  }


  // ---------- ПРИНЯТЬ ----------
  if (interaction.isButton() && interaction.customId.startsWith('accept_')) {

    await interaction.deferUpdate();

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const role1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
    const role2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

    if (role1) await member.roles.add(role1);
    if (role2) await member.roles.add(role2);

    await member.send('🎉 Ваша заявка принята!');

    await interaction.message.edit({ components: [] });
  }


  // ---------- ОТКЛОНЕНИЕ ----------
  if (interaction.isButton() && interaction.customId.startsWith('reject_')) {

    const id = interaction.customId.split('_')[1];

    const modal = new ModalBuilder()
      .setCustomId(`rejectReason_${id}`)
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

  if (interaction.isModalSubmit() && interaction.customId.startsWith('rejectReason_')) {

    await interaction.deferUpdate();

    const id = interaction.customId.split('_')[1];
    const reason = interaction.fields.getTextInputValue('reason');

    const member = await interaction.guild.members.fetch(id);
    await member.send(`❌ Заявка отклонена\nПричина: ${reason}`);

    await interaction.message.edit({ components: [] });
  }


  // ---------- МЕНЮ ----------
  if (interaction.isButton() && interaction.customId === 'menu') {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('act_drop').setLabel('Дроп').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('act_mp').setLabel('МП').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('act_capt').setLabel('Капт').setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ content: 'Выбери активность:', components: [row], flags: MessageFlags.Ephemeral });
  }


  // ---------- БАЛАНС ----------
  if (interaction.isButton() && interaction.customId === 'balance') {
    return interaction.reply({
      content: `💰 Баланс: ${getCoins(interaction.user.id)} мак-коинов`,
      flags: MessageFlags.Ephemeral
    });
  }


  // ---------- АКТИВНОСТЬ → ЛОГ ----------
  if (interaction.isButton() && interaction.customId.startsWith('act_')) {

    const type = interaction.customId.split('_')[1];
    const channel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setDescription(`${interaction.user} запросил начисление за ${type}`);

    const btn = new ButtonBuilder()
      .setCustomId(`give_${interaction.user.id}_${type}`)
      .setLabel('✅ Начислить')
      .setStyle(ButtonStyle.Success);

    await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });

    return interaction.reply({ content: 'Отправлено на проверку!', flags: MessageFlags.Ephemeral });
  }


  // ---------- НАЧИСЛЕНИЕ ----------
  if (interaction.isButton() && interaction.customId.startsWith('give_')) {

    await interaction.deferUpdate();

    const [, id, type] = interaction.customId.split('_');

    addCoins(id, SCORES[type]);

    const member = await interaction.guild.members.fetch(id);
    await member.send(`🎉 Начислено ${SCORES[type]} мак-коинов`);

    await interaction.message.edit({ components: [] });
  }

});


// ================= ЛОГИН =================
client.login(process.env.BOT_TOKEN);
