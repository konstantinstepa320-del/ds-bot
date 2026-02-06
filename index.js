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

const APPLY_CHANNEL_ID = "1469158146500198645"; // канал заявок
const POINTS_CHANNEL_ID = "1464632454697455737"; // канал логов баллов

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

// кто может принимать заявки
const STAFF_ROLES = ["High", "Helper", "Moder"];

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";


// ================= БАЗА БАЛЛОВ =================

const DB_FILE = './points.json';

let pointsDB = {};
if (fs.existsSync(DB_FILE)) {
  pointsDB = JSON.parse(fs.readFileSync(DB_FILE));
}

function addPoints(userId, amount) {
  if (!pointsDB[userId]) pointsDB[userId] = 0;
  pointsDB[userId] += amount;
  fs.writeFileSync(DB_FILE, JSON.stringify(pointsDB, null, 2));
}

function getPoints(userId) {
  return pointsDB[userId] || 0;
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

function hasStaffRole(member) {
  return member.roles.cache.some(r => STAFF_ROLES.includes(r.name));
}


// ================= ЗАЯВКА КНОПКА =================

client.on('messageCreate', async message => {
  if (message.author.bot) return;

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

    message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== повышение =====
  if (message.content === '!повышение') {

    const btn = new ButtonBuilder()
      .setCustomId('points_menu')
      .setLabel('📈 Открыть систему баллов')
      .setStyle(ButtonStyle.Success);

    message.channel.send({
      content: '📊 Система повышения',
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== проверить баллы =====
  if (message.content === '!баллы') {
    const pts = getPoints(message.author.id);
    message.reply(`🏆 У тебя **${pts} баллов**`);
  }

});


// ================= ИНТЕРАКЦИИ =================

client.on('interactionCreate', async interaction => {

  // ===== открыть форму заявки =====
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


  // ===== отправка заявки =====
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

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
        { name: 'Откат / спешик', value: interaction.fields.getTextInputValue('skills') }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`watch_${interaction.user.id}`).setLabel('👀 Смотрю').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel('📞 Обзвон').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger),
    );

    await channel.send({ embeds: [embed], components: [row] });

    interaction.reply({ content: '✅ Заявка отправлена!', flags: MessageFlags.Ephemeral });
  }


  // ===== КНОПКИ ТОЛЬКО ДЛЯ STAFF =====
  if (interaction.isButton() &&
      ['watch_', 'call_', 'accept_', 'reject_']
        .some(p => interaction.customId.startsWith(p))) {

    if (!hasStaffRole(interaction.member)) {
      return interaction.reply({
        content: '❌ У тебя нет доступа',
        flags: MessageFlags.Ephemeral
      });
    }
  }


  // ===== смотрю =====
  if (interaction.customId.startsWith('watch_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    member.send('👀 Ваша заявка взята на рассмотрение');
    return interaction.reply({ content: 'Готово', flags: MessageFlags.Ephemeral });
  }


  // ===== обзвон =====
  if (interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    member.send('📞 Вас вызывают на обзвон!');
    return interaction.reply({ content: 'Готово', flags: MessageFlags.Ephemeral });
  }


  // ===== принять =====
  if (interaction.customId.startsWith('accept_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const r1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
    const r2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

    if (r1) await member.roles.add(r1);
    if (r2) await member.roles.add(r2);

    member.send('🎉 Заявка принята');
    return interaction.update({ content: '✅ Принято', components: [] });
  }


  // ===== отклонить =====
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


  // ===== СИСТЕМА БАЛЛОВ =====

  if (interaction.isButton() && interaction.customId === 'points_menu') {

    const select = new StringSelectMenuBuilder()
      .setCustomId('points_select')
      .setPlaceholder('Выбери действие')
      .addOptions([
        { label: 'Трасса', value: '2' },
        { label: 'Дроп', value: '3' },
        { label: 'Капт', value: '4' },
        { label: 'Тайник', value: '2' },
        { label: 'Топ 1', value: '1' },
        { label: 'МП', value: '3' },
        { label: 'Снятие варна', value: '50' }
      ]);

    return interaction.reply({
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral
    });
  }


  if (interaction.isStringSelectMenu() && interaction.customId === 'points_select') {

    const amount = Number(interaction.values[0]);

    addPoints(interaction.user.id, amount);

    const total = getPoints(interaction.user.id);

    const logChannel = await interaction.guild.channels.fetch(POINTS_CHANNEL_ID);

    logChannel.send(`📈 ${interaction.user.tag} +${amount} | Всего: ${total}`);

    return interaction.update({
      content: `✅ Теперь у тебя ${total} баллов`,
      components: []
    });
  }

});


// ================= ЛОГИН =================

client.login(process.env.BOT_TOKEN);
