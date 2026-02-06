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
const ROLE_1 = "DaSouza";                // 1 роль
const ROLE_2 = "Test";                  // 2 роль

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


// ================= ЗАПУСК =================
client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= !заявка =================
client.on('messageCreate', async message => {
  if (message.content !== '!заявка') return;

  const embed = new EmbedBuilder()
    .setColor('DarkRed')
    .setImage(IMAGE_URL) // 🔥 картинка сверху
    .setTitle('👋 Путь в семью начинается здесь!')
    .setDescription(
`• Уведомление об обзвоне приходит в личные сообщения  
• Все заявки попадают в канал **#${APPLY_CHANNEL_NAME}**  
• Ответ обычно в течение 24 часов  

👇 Нажми кнопку ниже, чтобы подать заявку`
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
      input('skills', 'Откат тяги / спешик', TextInputStyle.Paragraph)
    );

    return interaction.showModal(modal);
  }


  // ---------- отправка формы ----------
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    const channel = interaction.guild.channels.cache.find(
      c => c.name === APPLY_CHANNEL_NAME
    );

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


  // ---------- СМОТРЮ ----------
  if (interaction.isButton() && interaction.customId.startsWith('watch_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    await member.send('👀 Ваша заявка взята на рассмотрение!');
    interaction.reply({ content: '👀 Вы взяли заявку', ephemeral: true });
  }


  // ---------- ОБЗВОН ----------
  if (interaction.isButton() && interaction.customId.startsWith('call_')) {
    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    await member.send('📞 Вас вызывают на обзвон! Зайдите в голосовой канал.');
    interaction.reply({ content: '📞 Пользователь вызван', ephemeral: true });
  }


  // ---------- ПРИНЯТЬ (выдача ролей) ----------
  if (interaction.isButton() && interaction.customId.startsWith('accept_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const role1 = interaction.guild.roles.cache.find(r => r.name === ROLE_1);
    const role2 = interaction.guild.roles.cache.find(r => r.name === ROLE_2);

    if (role1) await member.roles.add(role1);
    if (role2) await member.roles.add(role2);

    await member.send('🎉 Поздравляем! Ваша заявка принята. Роли выданы.');

    interaction.update({ content: '✅ Принято', components: [] });
  }


  // ---------- ОТКЛОНИТЬ С ПРИЧИНОЙ ----------
  if (interaction.isButton() && interaction.customId.startsWith('reject_')) {

    const modal = new ModalBuilder()
      .setCustomId(`rejectReason_${interaction.customId.split('_')[1]}`)
      .setTitle('Причина отказа');

    const input = new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Укажите причину')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
    );

    modal.addComponents(input);

    return interaction.showModal(modal);
  }


  // ---------- отправка причины ----------
  if (interaction.isModalSubmit() && interaction.customId.startsWith('rejectReason_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    const reason = interaction.fields.getTextInputValue('reason');

    await member.send(`❌ Ваша заявка отклонена.\nПричина: ${reason}`);

    interaction.update({ content: `❌ Отклонено\nПричина: ${reason}`, components: [] });
  }

});


// ================= ЛОГИН =================
client.login(process.env.BOT_TOKEN);
