Kenzo, [07.02.2026 4:40]
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


// ================= НАСТРОЙКИ =================
const APPLY_CHANNEL_ID = "1469158146500198645";
const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";
const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";
// ============================================


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});


// ================= ЗАПУСК =================
client.once('ready', () => {
  console.log(✅ Бот запущен как ${client.user.tag});
});


// ================= КОМАНДА !заявка =================
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content !== '!заявка') return;

  const embed = new EmbedBuilder()
    .setColor('DarkRed')
    .setImage(IMAGE_URL)
    .setTitle('👋 Путь в семью начинается здесь!')
    .setDescription(`
• Все заявки отправляются администрации
• Ответ обычно в течение 24 часов

👇 Нажми кнопку ниже, чтобы подать заявку
`);

  const btn = new ButtonBuilder()
    .setCustomId('apply')
    .setLabel('Подать заявку')
    .setStyle(ButtonStyle.Primary);

  await message.channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(btn)]
  });
});


// ================= ИНТЕРАКЦИИ =================
client.on('interactionCreate', async interaction => {

  // ===== ОТКРЫТЬ МОДАЛКУ =====
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


  // ===== ОТПРАВКА ЗАЯВКИ =====
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {
    const channel = await interaction.guild.channels.fetch(APPLY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('📩 Новая заявка')
      .addFields(
        { name: '👤 Пользователь', value: ${interaction.user} },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
        { name: 'Откат / спешик', value: interaction.fields.getTextInputValue('skills') }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(watch_${interaction.user.id}).setLabel('👀 Смотрю').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(call_${interaction.user.id}).setLabel('📞 Обзвон').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(accept_${interaction.user.id}).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(reject_${interaction.user.id}).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: '✅ Заявка отправлена!',
      flags: MessageFlags.Ephemeral
    });
  }

Kenzo, [07.02.2026 4:40]
// ===== СМОТРЮ =====
  if (interaction.isButton() && interaction.customId.startsWith('watch_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    await member.send('👀 Ваша заявка взята на рассмотрение!');
    return interaction.reply({ content: '👀 Вы взяли заявку', flags: MessageFlags.Ephemeral });
  }


  // ===== ОБЗВОН =====
  if (interaction.isButton() && interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    await member.send('📞 Вас вызывают на обзвон! Зайдите в голосовой канал.');
    return interaction.reply({ content: '📞 Пользователь вызван', flags: MessageFlags.Ephemeral });
  }


  // ===== ПРИНЯТЬ =====
  if (interaction.isButton() && interaction.customId.startsWith('accept_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const role1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
    const role2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

    if (role1) await member.roles.add(role1);
    if (role2) await member.roles.add(role2);

    await member.send('🎉 Поздравляем! Ваша заявка принята. Роли выданы.');

    return interaction.update({ content: '✅ Принято', components: [] });
  }


  // ===== ОТКЛОНИТЬ =====
  if (interaction.isButton() && interaction.customId.startsWith('reject_')) {
    const id = interaction.customId.split('_')[1];

    const modal = new ModalBuilder()
      .setCustomId(rejectReason_${id})
      .setTitle('Причина отказа');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Укажите причину')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }


  // ===== ПРИЧИНА =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith('rejectReason_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    const reason = interaction.fields.getTextInputValue('reason');

    await member.send(❌ Ваша заявка отклонена.\nПричина: ${reason});

    return interaction.update({
      content: ❌ Отклонено\nПричина: ${reason},
      components: []
    });
  }
});


// ================= ЛОГИН =================
client.login(process.env.TOKEN);