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
const SCREEN_CHANNEL = "1469477344161959957";
const BALANCE_CHANNEL = "1469478344772026409";

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";
// ============================================



// ================= ХРАНИЛИЩЕ (JSON) =================
const DB_FILE = './coins.json';

function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');
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
// ============================================



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


  // ===== !заявка =====
  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription('👇 Нажми кнопку ниже');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    return message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== !повышение =====
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


  // ===== !баланс =====
  if (message.content === '!баланс') {
    return message.reply(`🪙 Баланс: **${getCoins(message.author.id)} МакКоинов**`);
  }


  // ===== кнопка под скрином =====
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


  // ===== отправка заявки =====
  if (interaction.isModalSubmit() && interaction.customId === 'applyModal') {

    const channel = await interaction.guild.channels.fetch(APPLY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('📩 Новая заявка')
      .setDescription(`${interaction.user}`);

    await channel.send({ embeds: [embed] });

    return interaction.reply({ content: '✅ Отправлено', flags: MessageFlags.Ephemeral });
  }



  // ===== меню =====
  if (interaction.isButton() && interaction.customId === 'promo_menu') {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("drop").setLabel("Дроп +3").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("arena").setLabel("Топ1 +1").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("mp").setLabel("МП +4").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("capt").setLabel("Капт +4").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("race").setLabel("Трасса +2").setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
  }


  // ===== баланс кнопка =====
  if (interaction.isButton() && interaction.customId === 'promo_balance') {
    return interaction.reply({
      content: `🪙 Баланс: **${getCoins(interaction.user.id)}**`,
      flags: MessageFlags.Ephemeral
    });
  }


  const actions = {
    drop: 3,
    arena: 1,
    mp: 4,
    capt: 4,
    race: 2
  };


  if (interaction.isButton() && actions[interaction.customId]) {

    const amount = actions[interaction.customId];

    addCoins(interaction.user.id, amount);

    const log = await interaction.guild.channels.fetch(BALANCE_CHANNEL);
    log.send(`💰 <@${interaction.user.id}> получил +${amount}`);

    return interaction.reply({
      content: `✅ +${amount} МакКоин(ов)`,
      flags: MessageFlags.Ephemeral
    });
  }


  // ===== молодец =====
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