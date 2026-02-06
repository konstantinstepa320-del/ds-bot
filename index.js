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
const STAFF_ROLE = "Hight"; // ← ТОЛЬКО ЭТА РОЛЬ МОЖЕТ ЖАТЬ КНОПКИ
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


// ===== ПРОВЕРКА РОЛИ =====
function hasAccess(member) {
  return member.roles.cache.some(r => r.name === STAFF_ROLE);
}


// ================= ЗАПУСК =================
client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= !заявка =================
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content !== '!заявка') return;

  const embed = new EmbedBuilder()
    .setColor('DarkRed')
    .setTitle('Подать заявку');

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


  // ===== ВСЕ КНОПКИ ТОЛЬКО ДЛЯ Hight =====
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
  if (interaction.isButton() && interaction.customId.startsWith('watch_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    await member.send('👀 Заявка на рассмотрении');
    return interaction.reply({ content: 'Готово', flags: MessageFlags.Ephemeral });
  }

  if (interaction.isButton() && interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);
    await member.send('📞 Вас вызывают на обзвон');
    return interaction.reply({ content: 'Готово', flags: MessageFlags.Ephemeral });
  }

  if (interaction.isButton() && interaction.customId.startsWith('accept_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const role1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
    const role2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

    if (role1) await member.roles.add(role1);
    if (role2) await member.roles.add(role2);

    return interaction.update({ content: '✅ Принято', components: [] });
  }

  if (interaction.isButton() && interaction.customId.startsWith('reject_')) {
    return interaction.update({ content: '❌ Отклонено', components: [] });
  }

});


client.login(process.env.BOT_TOKEN);
