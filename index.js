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

const { QuickDB } = require('quick.db');
const db = new QuickDB();


// ================= НАСТРОЙКИ =================

// заявки
const APPLY_CHANNEL_ID = "1469158146500198645";
const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

// повышение
const SCREEN_CHANNEL = "1469477344161959957"; // скрины
const BALANCE_CHANNEL = "1469478344772026409"; // лог начислений

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";


// ================= БОТ =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// =================================================
// ================= КОМАНДЫ ЧАТА ==================
// =================================================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ================= !заявка =================
  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription(
`• Все заявки отправляются администрации
• Ответ обычно в течение 24 часов

👇 Нажми кнопку ниже`
      );

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    return message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ================= !повышение =================
  if (message.content === '!повышение') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('🪙 Система повышения')
      .setDescription(
`Зарабатывай **МакКоины**

Дроп — 3
Топ 1 арены — 1
МП — 4
Капт — 4
Трасса — 2`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("promo_menu")
        .setLabel("📋 Открыть меню")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("promo_balance")
        .setLabel("🪙 Мой баланс")
        .setStyle(ButtonStyle.Secondary)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }


  // ================= !баланс =================
  if (message.content === '!баланс') {
    const coins = await db.get(`coins_${message.author.id}`) || 0;

    return message.reply(`🪙 Ваш баланс: **${coins} МакКоинов**`);
  }


  // ================= кнопка под скринами =================
  if (message.channel.id === SCREEN_CHANNEL) {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`good_${message.author.id}`)
        .setLabel("👍 Молодец +2")
        .setStyle(ButtonStyle.Success)
    );

    message.reply({ components: [row] });
  }
});


// =================================================
// ================= ИНТЕРАКЦИИ ====================
// =================================================
client.on('interactionCreate', async interaction => {

  // =================================================
  // ================= ЗАЯВКА ========================
  // =================================================

  // модалка
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


  // отправка заявки
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    const channel = await interaction.guild.channels.fetch(APPLY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('📩 Новая заявка')
      .addFields(
        { name: '👤 Пользователь', value: `${interaction.user}` },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
        { name: 'Навыки', value: interaction.fields.getTextInputValue('skills') }
      );

    await channel.send({ embeds: [embed] });

    return interaction.reply({
      content: '✅ Заявка отправлена!',
      flags: MessageFlags.Ephemeral
    });
  }



  // =================================================
  // ================= МАККОИНЫ ======================
  // =================================================

  const actions = {
    drop: [3, "Дроп"],
    arena: [1, "Топ 1 арены"],
    mp: [4, "МП"],
    capt: [4, "Капт"],
    race: [2, "Трасса"]
  };


  // меню
  if (interaction.isButton() && interaction.customId === "promo_menu") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("drop").setLabel("Дроп +3").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("arena").setLabel("Топ 1 +1").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("mp").setLabel("МП +4").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("capt").setLabel("Капт +4").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("race").setLabel("Трасса +2").setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
  }


  // баланс
  if (interaction.isButton() && interaction.customId === "promo_balance") {
    const coins = await db.get(`coins_${interaction.user.id}`) || 0;

    return interaction.reply({
      content: `🪙 Баланс: **${coins} МакКоинов**`,
      flags: MessageFlags.Ephemeral
    });
  }


  // начисление
  if (interaction.isButton() && actions[interaction.customId]) {

    const [amount, reason] = actions[interaction.customId];

    await db.add(`coins_${interaction.user.id}`, amount);

    const channel = await interaction.guild.channels.fetch(BALANCE_CHANNEL);

    channel.send(`💰 <@${interaction.user.id}> получил ${amount} МакКоин(ов) | ${reason}`);

    return interaction.reply({
      content: `✅ +${amount} МакКоин(ов)`,
      flags: MessageFlags.Ephemeral
    });
  }


  // кнопка "молодец"
  if (interaction.isButton() && interaction.customId.startsWith("good_")) {

    const id = interaction.customId.split("_")[1];

    await db.add(`coins_${id}`, 2);

    const member = await interaction.guild.members.fetch(id);

    member.send("🔥 Молодец! Ты получил +2 МакКоина");

    return interaction.reply({
      content: "Начислено +2",
      flags: MessageFlags.Ephemeral
    });
  }

});


// ================= ЛОГИН =================
client.login(process.env.BOT_TOKEN);
