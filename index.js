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
  MessageFlags,
  StringSelectMenuBuilder
} = require('discord.js');

const fs = require('fs');


// ================= НАСТРОЙКИ =================

const APPLY_CHANNEL_ID = "1469158146500198645";
const POINTS_CHANNEL_ID = "1464632454697455737";

const STAFF_ROLES = ["High", "Helper", "Moder"];

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";


// ================= БАЛЛЫ =================

const DB_FILE = "./points.json";

let pointsDB = {};
if (fs.existsSync(DB_FILE)) {
  pointsDB = JSON.parse(fs.readFileSync(DB_FILE));
}

function addPoints(id, amount) {
  if (!pointsDB[id]) pointsDB[id] = 0;
  pointsDB[id] += amount;
  fs.writeFileSync(DB_FILE, JSON.stringify(pointsDB, null, 2));
}

function getPoints(id) {
  return pointsDB[id] || 0;
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

client.once('clientReady', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= ПРОВЕРКА РОЛЕЙ =================

function hasStaff(member) {
  return member.roles.cache.some(r => STAFF_ROLES.includes(r.name));
}


// ================= КОМАНДЫ =================

client.on('messageCreate', async message => {
  if (message.author.bot) return;


  // ===== ЗАЯВКА =====
  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Подать заявку')
      .setDescription('Нажми кнопку ниже');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== ПОВЫШЕНИЕ =====
  if (message.content === '!повышение') {

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setImage(IMAGE_URL)
      .setTitle('📈 Система повышения')
      .setDescription('Нажми кнопку чтобы получить баллы');

    const btn = new ButtonBuilder()
      .setCustomId('points_menu')
      .setLabel('Получить баллы')
      .setStyle(ButtonStyle.Success);

    message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== МОИ БАЛЛЫ =====
  if (message.content === '!баллы') {
    message.reply(`🏆 У тебя **${getPoints(message.author.id)} баллов**`);
  }

});


// ================= ИНТЕРАКЦИИ =================

client.on('interactionCreate', async interaction => {

  // ---------- ОТКРЫТЬ ФОРМУ ----------
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
      .setTitle('📩 Новая заявка')
      .addFields(
        { name: 'Пользователь', value: `${interaction.user}` },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
        { name: 'Навыки', value: interaction.fields.getTextInputValue('skills') }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`watch_${interaction.user.id}`).setLabel('👀').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel('📞').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('❌').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply({ content: '✅ Заявка отправлена' });
  }


  // ---------- STAFF CHECK ----------
  if (interaction.isButton() &&
      ['watch_', 'call_', 'accept_', 'reject_'].some(x => interaction.customId.startsWith(x))) {

    if (!hasStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ У тебя нет доступа',
        flags: MessageFlags.Ephemeral
      });
    }
  }


  // ---------- СМОТРЮ ----------
  if (interaction.customId.startsWith('watch_')) {
    return interaction.reply({ content: '👀 Взято', flags: MessageFlags.Ephemeral });
  }


  // ---------- ОБЗВОН ----------
  if (interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    member.send('📞 Вас вызывают на обзвон');
    return interaction.reply({ content: '📞 Вызван', flags: MessageFlags.Ephemeral });
  }


  // ---------- ПРИНЯТЬ ----------
  if (interaction.customId.startsWith('accept_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const r1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
    const r2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

    if (r1) await member.roles.add(r1);
    if (r2) await member.roles.add(r2);

    return interaction.update({ content: '✅ Принято', components: [] });
  }


  // ---------- ОТКЛОНИТЬ ----------
  if (interaction.customId.startsWith('reject_')) {

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
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('rejectReason_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    const reason = interaction.fields.getTextInputValue('reason');

    member.send(`❌ Заявка отклонена\nПричина: ${reason}`);

    return interaction.update({ content: '❌ Отклонено', components: [] });
  }


  // ================= БАЛЛЫ =================

  if (interaction.isButton() && interaction.customId === 'points_menu') {

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const select = new StringSelectMenuBuilder()
      .setCustomId('points_select')
      .addOptions([
        { label: 'Трасса (+2)', value: '2' },
        { label: 'Дроп (+3)', value: '3' },
        { label: 'Капт (+4)', value: '4' },
        { label: 'Тайник (+2)', value: '2' },
        { label: 'Топ 1 (+1)', value: '1' },
        { label: 'МП (+3)', value: '3' },
        { label: 'Снятие варна (+50)', value: '50' }
      ]);

    return interaction.editReply({
      content: 'Выбери действие:',
      components: [new ActionRowBuilder().addComponents(select)]
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'points_select') {

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const amount = Number(interaction.values[0]);

    addPoints(interaction.user.id, amount);

    const total = getPoints(interaction.user.id);

    const log = await interaction.guild.channels.fetch(POINTS_CHANNEL_ID);
    log.send(`📈 ${interaction.user.tag} +${amount} | Всего: ${total}`);

    return interaction.editReply({ content: `✅ Теперь у тебя ${total} баллов` });
  }

});


// ================= ЛОГИН =================

client.login(process.env.BOT_TOKEN);