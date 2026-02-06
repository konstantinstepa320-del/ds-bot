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


// ========= НАСТРОЙ =========
const APPLY_CHANNEL_NAME = "итог-заявок";
const ROLE_NAME = "Участник";
const IMAGE_URL = "https://cdn.discordapp.com/attachments/1287476053052493897/1437158625801146368/image.png";
// ==========================


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// ================= ЗАПУСК =================
client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= !заявка =================
client.on('messageCreate', async message => {
  if (message.content !== '!заявка') return;

  const embed = new EmbedBuilder()
    .setTitle('🔥 Подача заявки')
    .setDescription('👇 Нажми кнопку ниже, чтобы подать заявку')
    .setColor('Red')
    .setImage(IMAGE_URL);

  const btn = new ButtonBuilder()
    .setCustomId('apply')
    .setLabel('Подать заявку')
    .setStyle(ButtonStyle.Primary);

  message.channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(btn)]
  });
});


// ================= ВСЕ ИНТЕРАКЦИИ =================
client.on('interactionCreate', async interaction => {

  // ---------- открыть форму ----------
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
      input('skills', 'Откат тяги / спешик', TextInputStyle.Paragraph) // ✅ ИСПРАВЛЕНО
    );

    return interaction.showModal(modal);
  }


  // ---------- отправка формы ----------
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    const channel = interaction.guild.channels.cache.find(
      c => c.name === APPLY_CHANNEL_NAME
    );

    if (!channel) {
      return interaction.reply({
        content: '❌ Канал заявок не найден',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📩 Новая заявка')
      .setColor('Red')
      .addFields(
        { name: '👤 Пользователь', value: `${interaction.user}` },
        { name: 'Ник / Имя / Возраст', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн / Уровень', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
        { name: 'Откат тяги / спешик', value: interaction.fields.getTextInputValue('skills') } // ✅ ИСПРАВЛЕНО
      );


    const watch = new ButtonBuilder()
      .setCustomId(`watch_${interaction.user.id}`)
      .setLabel('👀 Смотрю')
      .setStyle(ButtonStyle.Secondary);

    const call = new ButtonBuilder()
      .setCustomId(`call_${interaction.user.id}`)
      .setLabel('📞 Обзвон')
      .setStyle(ButtonStyle.Primary);

    const accept = new ButtonBuilder()
      .setCustomId(`accept_${interaction.user.id}`)
      .setLabel('✅ Принять')
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId(`reject_${interaction.user.id}`)
      .setLabel('❌ Отклонить')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(watch, call, accept, reject);

    channel.send({ embeds: [embed], components: [row] });

    interaction.reply({ content: '✅ Заявка отправлена!', ephemeral: true });
  }


  // ---------- 👀 СМОТРЮ ----------
  if (interaction.isButton() && interaction.customId.startsWith('watch_')) {
    interaction.reply({ content: `👀 Рассматривает ${interaction.user}`, ephemeral: false });
  }


  // ---------- 📞 ОБЗВОН ----------
  if (interaction.isButton() && interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    member.send('📞 Вас вызывают на обзвон!');
    interaction.reply({ content: '📞 Пользователь вызван', ephemeral: true });
  }


  // ---------- ✅ ПРИНЯТЬ ----------
  if (interaction.isButton() && interaction.customId.startsWith('accept_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    const role = interaction.guild.roles.cache.find(r => r.name === ROLE_NAME);

    if (role) await member.roles.add(role);

    member.send('🎉 Ваша заявка принята!');
    interaction.update({ content: '✅ Принято', components: [] });
  }


  // ---------- ❌ ОТКЛОНИТЬ ----------
  if (interaction.isButton() && interaction.customId.startsWith('reject_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    member.send('❌ Ваша заявка отклонена.');
    interaction.update({ content: '❌ Отклонено', components: [] });
  }

});


// ================= ВХОД =================
client.login(process.env.BOT_TOKEN);