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
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');


// ================= НАСТРОЙКИ =================
const TOKEN = "ТОКЕН_СЮДА";

const APPLY_CHANNEL_ID = "1469158146500198645";
const LOG_CHANNEL_ID = "1469477344161959957";

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";
// ============================================


// простая память для баллов
const coins = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});


// ================= ЗАПУСК =================
client.once('clientReady', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= КОМАНДЫ =================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ---------- ЗАЯВКА ----------
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


  // ---------- МАККОЙН МЕНЮ ----------
  if (message.content === '!меню') {

    const menu = new StringSelectMenuBuilder()
      .setCustomId('eventMenu')
      .setPlaceholder('Выберите мероприятие')
      .addOptions([
        { label: 'МП', value: 'mp' },
        { label: 'Тайник', value: 'stash' },
        { label: 'Повышение', value: 'up' }
      ]);

    const balanceBtn = new ButtonBuilder()
      .setCustomId('balance')
      .setLabel('💰 Мои баллы')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(menu);
    const row2 = new ActionRowBuilder().addComponents(balanceBtn);

    return message.channel.send({
      content: '📋 Выберите действие:',
      components: [row1, row2]
    });
  }
});


// ================= ИНТЕРАКЦИИ =================
client.on('interactionCreate', async interaction => {

  // =================================================
  // ===== ЗАЯВКА (модалка)
  // =================================================
  if (interaction.isButton() && interaction.customId === 'apply') {

    const modal = new ModalBuilder()
      .setCustomId('applyModal')
      .setTitle('Заявка');

    const make = (id, label, style) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(true)
      );

    modal.addComponents(
      make('nick', 'Ник / Имя / Возраст', TextInputStyle.Short),
      make('online', 'Суточный онлайн и уровень', TextInputStyle.Short),
      make('fam', 'В каких семьях были?', TextInputStyle.Paragraph),
      make('where', 'Как узнал о семье?', TextInputStyle.Short),
      make('skills', 'Откат тяги / спешик', TextInputStyle.Paragraph)
    );

    return interaction.showModal(modal);
  }


  // =================================================
  // ===== ОТПРАВКА ЗАЯВКИ
  // =================================================
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    const channel = await interaction.guild.channels.fetch(APPLY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('📩 Новая заявка')
      .addFields(
        { name: '👤 Пользователь', value: `${interaction.user}` },
        { name: 'Ник / Имя / Возраст', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Суточный онлайн и уровень', value: interaction.fields.getTextInputValue('online') },
        { name: 'В каких семьях были?', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Как узнал о семье?', value: interaction.fields.getTextInputValue('where') },
        { name: 'Откат тяги / спешик', value: interaction.fields.getTextInputValue('skills') }
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


  // =================================================
  // ===== КНОПКИ ЗАЯВКИ
  // =================================================
  if (interaction.isButton()) {

    const id = interaction.customId.split('_')[1];
    const member = id ? await interaction.guild.members.fetch(id) : null;

    if (interaction.customId.startsWith('watch_')) {
      await member.send('👀 Ваша заявка взята на рассмотрение!');
      return interaction.reply({ content: 'Готово', flags: MessageFlags.Ephemeral });
    }

    if (interaction.customId.startsWith('call_')) {
      await member.send('📞 Вас вызывают на обзвон!');
      return interaction.reply({ content: 'Пользователь вызван', flags: MessageFlags.Ephemeral });
    }

    if (interaction.customId.startsWith('accept_')) {
      const role1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
      const role2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

      if (role1) await member.roles.add(role1);
      if (role2) await member.roles.add(role2);

      await member.send('🎉 Ваша заявка принята!');
      return interaction.update({ content: '✅ Принято', components: [] });
    }

    if (interaction.customId.startsWith('reject_')) {
      const modal = new ModalBuilder()
        .setCustomId(`rejectReason_${id}`)
        .setTitle('Причина отказа')
        .addComponents(
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

    // баланс
    if (interaction.customId === 'balance') {
      const bal = coins.get(interaction.user.id) || 0;
      return interaction.reply({
        content: `💰 У тебя ${bal} баллов`,
        flags: MessageFlags.Ephemeral
      });
    }
  }


  // =================================================
  // ===== ОТКЛОНЕНИЕ
  // =================================================
  if (interaction.isModalSubmit() && interaction.customId.startsWith('rejectReason_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    const reason = interaction.fields.getTextInputValue('reason');

    await member.send(`❌ Заявка отклонена\nПричина: ${reason}`);

    return interaction.update({
      content: `❌ Отклонено\nПричина: ${reason}`,
      components: []
    });
  }


  // =================================================
  // ===== МАККОЙН МЕНЮ
  // =================================================
  if (interaction.isStringSelectMenu() && interaction.customId === 'eventMenu') {

    const type = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`event_${type}`)
      .setTitle('Отправка отчёта');

    const make = (id, label) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      );

    modal.addComponents(
      make('nick', 'Ваш ник'),
      make('link', 'Ссылка на скрин')
    );

    return interaction.showModal(modal);
  }


  // =================================================
  // ===== ОТПРАВКА ОТЧЁТА В ЛОГ
  // =================================================
  if (interaction.isModalSubmit() && interaction.customId.startsWith('event_')) {

    const log = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

    const nick = interaction.fields.getTextInputValue('nick');
    const link = interaction.fields.getTextInputValue('link');

    const embed = new EmbedBuilder()
      .setTitle('📸 Новый отчёт')
      .addFields(
        { name: 'Пользователь', value: `${interaction.user}` },
        { name: 'Ник', value: nick },
        { name: 'Ссылка', value: link }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`give_${interaction.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger)
    );

    await log.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: 'Отчёт отправлен!', flags: MessageFlags.Ephemeral });
  }


  // =================================================
  // ===== ВЫДАЧА БАЛЛОВ
  // =================================================
  if (interaction.isButton() && interaction.customId.startsWith('give_')) {

    const id = interaction.customId.split('_')[1];

    const bal = coins.get(id) || 0;
    coins.set(id, bal + 1);

    return interaction.update({ content: '✅ Балл выдан', components: [] });
  }

});


// ================= СТАРТ =================
client.login(process.env.TOKEN);
