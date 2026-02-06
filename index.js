const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');


// ================= НАСТРОЙКИ =================
const APPLY_CHANNEL_NAME = "итог-заявок"; // канал заявок
const ROLE_NAME = "Участник";            // роль при принятии
const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png?ex=698780d1&is=69862f51&hm=7ac657b0ea0d4f33ac9b690a7f2b19ddb4af9357602b314544580aedafe6149e&";
// ============================================


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});


// ================= READY =================
client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= !заявка =================
client.on('messageCreate', async message => {
  if (message.content !== '!заявка') return;

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setImage(IMAGE_URL) // 🔥 фото СВЕРХУ
    .setTitle('🔥 Подача заявки')
    .setDescription(
`👋 **Хочешь вступить в семью?**

Нажми кнопку ниже и заполни форму.`
    );

  const btn = new ButtonBuilder()
    .setCustomId('apply')
    .setLabel('Подать заявку')
    .setStyle(ButtonStyle.Primary);

  message.channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(btn)]
  });
});


// ================= ИНТЕРАКЦИИ =================
client.on('interactionCreate', async interaction => {

  // ===== ОТКРЫТЬ ФОРМУ =====
  if (interaction.isButton() && interaction.customId === 'apply') {

    const modal = new ModalBuilder()
      .setCustomId('applyModal')
      .setTitle('Заявка в семью');

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
      input('online', 'Суточный онлайн / левел', TextInputStyle.Short),
      input('fam', 'В каких семьях были?', TextInputStyle.Paragraph),
      input('where', 'Как узнал о семье?', TextInputStyle.Short),
      input('skills', 'Откат тяги / спешик', TextInputStyle.Paragraph)
    );

    return interaction.showModal(modal);
  }


  // ===== ОТПРАВКА ЗАЯВКИ =====
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    const channel = interaction.guild.channels.cache.find(
      c => c.name === APPLY_CHANNEL_NAME
    );

    const embed = new EmbedBuilder()
      .setColor('Red')
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
      new ButtonBuilder().setCustomId(`watch_${interaction.user.id}`).setLabel('Смотрю').setEmoji('👀').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel('Обзвон').setEmoji('📞').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('Отклонить').setStyle(ButtonStyle.Danger)
    );

    channel.send({ embeds: [embed], components: [row] });

    interaction.reply({ content: '✅ Заявка отправлена!', ephemeral: true });
  }


  // ===== СМОТРЮ =====
  if (interaction.isButton() && interaction.customId.startsWith('watch_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    await member.send('👀 Ваша заявка взята на рассмотрение!');
    interaction.reply({ content: `👀 ${interaction.user} рассматривает заявку`, ephemeral: false });
  }


  // ===== ОБЗВОН =====
  if (interaction.isButton() && interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    await member.send('📞 Вас вызывают на обзвон! Зайдите в голосовой канал.');
    interaction.reply({ content: '📞 Пользователь вызван на обзвон', ephemeral: false });
  }


  // ===== ПРИНЯТЬ =====
  if (interaction.isButton() && interaction.customId.startsWith('accept_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    const role = interaction.guild.roles.cache.find(r => r.name === ROLE_NAME);

    if (role) await member.roles.add(role);

    await member.send(`🎉 Ваша заявка принята!\nВам выдана роль **${ROLE_NAME}**`);

    interaction.update({
      content: `✅ Принято модератором ${interaction.user}`,
      components: []
    });
  }


  // ===== ОТКРЫТЬ МОДАЛКУ С ПРИЧИНОЙ =====
  if (interaction.isButton() && interaction.customId.startsWith('reject_')) {

    const id = interaction.customId.split('_')[1];

    const modal = new ModalBuilder()
      .setCustomId(`rejectModal_${id}`)
      .setTitle('Причина отказа');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Укажите причину отказа')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }


  // ===== ОТКАЗ С ПРИЧИНОЙ =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith('rejectModal_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const reason = interaction.fields.getTextInputValue('reason');

    await member.send(`❌ Ваша заявка отклонена.\n\nПричина:\n${reason}`);

    interaction.update({
      content: `❌ Отклонено\nПричина: ${reason}`,
      components: []
    });
  }

});


// ===== ВХОД =====
client.login(process.env.BOT_TOKEN);