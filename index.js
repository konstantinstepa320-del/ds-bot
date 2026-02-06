const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN; // токен берётся из Railway
const CHANNEL_ID = process.env.CHANNEL_ID; // айди канала из Railway

client.once('clientReady', async () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('🔥 Подача заявки')
    .setDescription('👇 Нажми кнопку, чтобы заполнить анкету')
    .setColor(0xff3b3b);

  const button = new ButtonBuilder()
    .setCustomId('apply')
    .setLabel('Подать заявку')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  await channel.send({ embeds: [embed], components: [row] });
});

client.on('interactionCreate', async (interaction) => {

  // кнопка
  if (interaction.isButton() && interaction.customId === 'apply') {

    const modal = new ModalBuilder()
      .setCustomId('form')
      .setTitle('Анкета');

    const name = new TextInputBuilder()
      .setCustomId('name')
      .setLabel('Ваше имя и возраст')
      .setStyle(TextInputStyle.Short);

    const families = new TextInputBuilder()
      .setCustomId('families')
      .setLabel('Список семей')
      .setStyle(TextInputStyle.Short);

    const lvl = new TextInputBuilder()
      .setCustomId('lvl')
      .setLabel('Лвл и онлайн')
      .setStyle(TextInputStyle.Short);

    const recoil = new TextInputBuilder()
      .setCustomId('recoil')
      .setLabel('Откат стрельбы')
      .setStyle(TextInputStyle.Paragraph);

    modal.addComponents(
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(families),
      new ActionRowBuilder().addComponents(lvl),
      new ActionRowBuilder().addComponents(recoil)
    );

    await interaction.showModal(modal);
  }

  // отправка формы
  if (interaction.isModalSubmit() && interaction.customId === 'form') {

    const embed = new EmbedBuilder()
      .setTitle('📩 Новая заявка')
      .addFields(
        { name: 'Имя/Возраст', value: interaction.fields.getTextInputValue('name') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('families') },
        { name: 'Лвл/Онлайн', value: interaction.fields.getTextInputValue('lvl') },
        { name: 'Откат', value: interaction.fields.getTextInputValue('recoil') }
      )
      .setColor(0x00ff99);

    await interaction.reply({ content: '✅ Заявка отправлена!', ephemeral: true });

    const channel = await client.channels.fetch(CHANNEL_ID);
    await channel.send({ embeds: [embed] });
  }
});

client.login(TOKEN);