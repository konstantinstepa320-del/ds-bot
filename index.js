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


// ===== ПРОВЕРКА ДОСТУПА =====
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
    content: 'Нажми кнопку чтобы подать заявку',
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

    modal.addComponents(
      input('nick', 'Ник / возраст', TextInputStyle.Short),
      input('online', 'Онлайн', TextInputStyle.Short),
      input('fam', 'Семьи', TextInputStyle.Paragraph),
      input('where', 'Откуда узнал', TextInputStyle.Short),
      input('skills', 'Навыки', TextInputStyle.Paragraph)
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
        { name: 'Пользователь', value: `${interaction.user}` },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда', value: interaction.fields.getTextInputValue('where') },
        { name: 'Навыки', value: interaction.fields.getTextInputValue('skills') }
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


  // ===== ВСЕ КНОПКИ ТОЛЬКО ДЛЯ СТАФФА =====
  if (interaction.isButton() &&
      (interaction.customId.startsWith('watch_') ||
       interaction.customId.startsWith('call_') ||
       interaction.customId.startsWith('accept_') ||
       interaction.customId.startsWith('reject_'))) {

    if (!hasAccess(interaction.member)) {
      return interaction.reply({
        content: '❌ У вас нет доступа',
        flags: MessageFlags.Ephemeral
      });
    }
  }


  // ===== действия =====
  if (interaction.customId.startsWith('watch_'))
    return interaction.reply({ content: '👀 Взято на рассмотрение', flags: MessageFlags.Ephemeral });

  if (interaction.customId.startsWith('call_'))
    return interaction.reply({ content: '📞 Вызван на обзвон', flags: MessageFlags.Ephemeral });

  if (interaction.customId.startsWith('accept_'))
    return interaction.update({ content: '✅ Принято', components: [] });

  if (interaction.customId.startsWith('reject_'))
    return interaction.update({ content: '❌ Отклонено', components: [] });

});


client.login(process.env.BOT_TOKEN);