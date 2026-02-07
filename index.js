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

const fs = require('fs');


// ================= НАСТРОЙКИ =================
const APPLY_CHANNEL_ID = "1469158146500198645";
const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const SCREEN_CHANNEL = "1469477344161959957";
const BALANCE_CHANNEL = "1469478344772026409";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";
// ============================================



// ================= БАЗА (JSON) =================
const DB_FILE = "./coins.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function addCoins(id, amount) {
  const db = loadDB();
  db[id] = (db[id] || 0) + amount;
  saveDB(db);
}

function getCoins(id) {
  const db = loadDB();
  return db[id] || 0;
}



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
// ================= КОМАНДЫ =======================
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

👇 Нажми кнопку ниже, чтобы подать заявку`
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
`Дроп — 3
Топ 1 — 1
МП — 4
Капт — 4
Трасса — 2`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("promo_menu").setLabel("📋 Меню").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("promo_balance").setLabel("🪙 Баланс").setStyle(ButtonStyle.Secondary)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }


  // ================= !баланс =================
  if (message.content === '!баланс') {
    return message.reply(`🪙 Баланс: **${getCoins(message.author.id)} МакКоинов**`);
  }


  // ================= кнопка под скрином =================
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

  // ===== МОДАЛКА ЗАЯВКИ =====
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
        { name: '👤 Пользователь', value: `${interaction.user}` },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
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


  // ===== НАЧИСЛЕНИЕ КОИНОВ =====
  const actions = { drop: 3, arena: 1, mp: 4, capt: 4, race: 2 };

  if (interaction.isButton() && actions[interaction.customId]) {

    addCoins(interaction.user.id, actions[interaction.customId]);

    const log = await interaction.guild.channels.fetch(BALANCE_CHANNEL);
    log.send(`💰 <@${interaction.user.id}> получил +${actions[interaction.customId]}`);

    return interaction.reply({ content: `+${actions[interaction.customId]}`, flags: MessageFlags.Ephemeral });
  }


  // ===== МОЛОДЕЦ =====
  if (interaction.isButton() && interaction.customId.startsWith('good_')) {

    const id = interaction.customId.split('_')[1];

    addCoins(id, 2);

    const member = await interaction.guild.members.fetch(id);
    member.send('🔥 Молодец! +2 МакКоина');

    return interaction.reply({ content: 'Начислено +2', flags: MessageFlags.Ephemeral });
  }

});


// ================= ЛОГИН =================
client.login(process.env.BOT_TOKEN);
