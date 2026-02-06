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

// канал заявок
const APPLY_CHANNEL_ID = "1469158146500198645";

// роли, которые могут нажимать кнопки
const STAFF_ROLES = [
  "leader",
  "Батя",
  "Сусанин",
  "Горячая Чикса",
  "Moder",
  "Coller",
  "HR",
  "Hight"
];

// роли, которые выдаются при принятии
const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

// ============================================


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});


// ===== проверка доступа =====
function hasAccess(member) {
  return member.roles.cache.some(r => STAFF_ROLES.includes(r.name));
}


// ================= ЗАПУСК =================
client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= !заявка =================
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content !== '!заявка') return;

  const btn = new ButtonBuilder()
    .setCustomId('apply')
    .setLabel('Подать заявку')
    .setStyle(ButtonStyle.Primary);

  await message.channel.send({
    content: 'Нажмите кнопку ниже, чтобы подать заявку',
    components: [new ActionRowBuilder().addComponents(btn)]
  });
});


// ================= ИНТЕРАКЦИИ =================
client.on('interactionCreate', async interaction => {

  // ===== открыть форму =====
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

    // 🔥 ТВОИ ПОЛЯ (как просил)
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
        { name: '👤 Пользователь', value: `${interaction.user}`, inline: false },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick'), inline: false },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online'), inline: false },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam'), inline: false },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where'), inline: false },
        { name: 'Откат / спешик', value: interaction.fields.getTextInputValue('skills'), inline: false }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`watch_${interaction.user.id}`).setLabel('👀 Смотрю').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel('📞 Обзвон').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({
      content: '✅ Заявка отправлена!',
      flags: MessageFlags.Ephemeral
    });
  }


  // ===== проверка доступа к кнопкам =====
  if (
    interaction.isButton() &&
    (
      interaction.customId.startsWith('watch_') ||
      interaction.customId.startsWith('call_') ||
      interaction.customId.startsWith('accept_') ||
      interaction.customId.startsWith('reject_')
    )
  ) {
    if (!hasAccess(interaction.member)) {
      return interaction.reply({
        content: '❌ У вас нет доступа',
        flags: MessageFlags.Ephemeral
      });
    }
  }


  // ===== действия =====
  if (interaction.customId.startsWith('watch_')) {
    return interaction.reply({ content: '👀 Заявка взята на рассмотрение', flags: MessageFlags.Ephemeral });
  }

  if (interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    await member.send('📞 Вас вызывают на обзвон!');
    return interaction.reply({ content: '📞 Пользователь вызван', flags: MessageFlags.Ephemeral });
  }

  if (interaction.customId.startsWith('accept_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const role1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
    const role2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

    if (role1) await member.roles.add(role1);
    if (role2) await member.roles.add(role2);

    return interaction.update({ content: '✅ Принято', components: [] });
  }

  if (interaction.customId.startsWith('reject_')) {
    return interaction.update({ content: '❌ Отклонено', components: [] });
  }

});


// ================= ЛОГИН =================
client.login(process.env.BOT_TOKEN);