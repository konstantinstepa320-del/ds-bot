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
// ===========================


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
    .setColor('#8b0000')
    .setImage(IMAGE_URL) // ← картинка СВЕРХУ
    .setDescription(
`👋 **Путь в семью начинается здесь!**

• Уведомление об обзвоне приходит в канал  
• Все заявки отправляются в **#${APPLY_CHANNEL_NAME}**  
• Ответ обычно в течение 24 часов  

👇 Нажмите кнопку ниже`
    );

  const btn = new ButtonBuilder()
    .setCustomId('apply')
    .setLabel('Подать заявку')
    .setStyle(ButtonStyle.Danger);

  message.channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(btn)]
  });
});


// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

  // ---------- ОТКРЫТЬ ФОРМУ ----------
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
      input('nick', 'Имя / Возраст / Ник', TextInputStyle.Short),
      input('online', 'Суточный онлайн + уровень', TextInputStyle.Short),
      input('fam', 'В каких семьях были?', TextInputStyle.Paragraph),
      input('where', 'Как узнал о семье?', TextInputStyle.Short),
      input('skills', 'Откат тяги / спешик', TextInputStyle.Paragraph)
    );

    return interaction.showModal(modal);
  }


  // ---------- ОТПРАВКА ЗАЯВКИ ----------
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    const channel = interaction.guild.channels.cache.find(
      c => c.name === APPLY_CHANNEL_NAME
    );

    const embed = new EmbedBuilder()
      .setTitle('📩 Новая заявка')
      .setColor('Red')
      .addFields(
        { name: '👤 Пользователь', value: `${interaction.user}` },
        { name: 'Имя / Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
        { name: 'Откат тяги / спешик', value: interaction.fields.getTextInputValue('skills') }
      );


    // ===== КНОПКИ =====
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
    return interaction.reply({ content: `👀 ${interaction.user} взял заявку на рассмотрение` });
  }


  // ---------- 📞 ОБЗВОН (В КАНАЛ) ----------
  if (interaction.isButton() && interaction.customId.startsWith('call_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    return interaction.reply({
      content: `📞 ${member} вызван на обзвон ${interaction.user}`
    });
  }


  // ---------- ✅ ПРИНЯТЬ ----------
  if (interaction.isButton() && interaction.customId.startsWith('accept_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    const role = interaction.guild.roles.cache.find(r => r.name === ROLE_NAME);

    if (role) await member.roles.add(role);

    return interaction.update({
      content: `✅ ${member} принят в семью`,
      components: []
    });
  }


  // ---------- ❌ ОТКЛОНИТЬ ----------
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
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }


  // ---------- ПРИЧИНА ОТКАЗА ----------
  if (interaction.isModalSubmit() && interaction.customId.startsWith('rejectReason_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    const reason = interaction.fields.getTextInputValue('reason');

    return interaction.update({
      content: `❌ ${member} отклонён\nПричина: ${reason}`,
      components: []
    });
  }

});


// ================= LOGIN =================
client.login(process.env.BOT_TOKEN);