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

const APPLY_CHANNEL_ID = "1469158146500198645"; // заявки
const PROMO_CHANNEL_ID = "1464632454697455737"; // система повышения
const LOG_CHANNEL_ID = "1469477344161959957";   // логи скринов
const BALANCE_CHANNEL_ID = "1469478344772026409"; // баланс

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";

// баллы
const SCORES = {
  drop: 3,
  top1: 1,
  mp: 4,
  capt: 4,
  race: 2
};

// файл хранения
const DB_FILE = './coins.json';
let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

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
client.once('clientReady', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});


// ================= КОМАНДЫ =================
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
      .setColor('Gold')
      .setImage(IMAGE_URL)
      .setTitle('💰 Система повышения')
      .setDescription(
`Мак-коин начисляется за:

Дроп — 3
Топ 1 — 1
МП — 4
Капт — 4
Трасса — 2`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu').setLabel('📋 Меню').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('balance').setLabel('💰 Баланс').setStyle(ButtonStyle.Secondary)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});


// ================= ИНТЕРАКЦИИ =================
client.on('interactionCreate', async interaction => {

  // ===== ОТКРЫТЬ МЕНЮ =====
  if (interaction.isButton() && interaction.customId === 'menu') {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('act_drop').setLabel('Дроп').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('act_top1').setLabel('Топ 1').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('act_mp').setLabel('МП').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('act_capt').setLabel('Капт').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('act_race').setLabel('Трасса').setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ content: 'Выбери активность:', components: [row], flags: MessageFlags.Ephemeral });
  }


  // ===== БАЛАНС =====
  if (interaction.isButton() && interaction.customId === 'balance') {

    const coins = db[interaction.user.id] || 0;

    return interaction.reply({
      content: `💰 У тебя ${coins} мак-коинов`,
      flags: MessageFlags.Ephemeral
    });
  }


  // ===== ВЫБОР АКТИВНОСТИ → МОДАЛКА =====
  if (interaction.isButton() && interaction.customId.startsWith('act_')) {

    const type = interaction.customId.split('_')[1];

    const modal = new ModalBuilder()
      .setCustomId(`send_${type}`)
      .setTitle('Отправка отчёта');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nick')
          .setLabel('Ник')
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('proof')
          .setLabel('Ссылка на скрин')
          .setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }


  // ===== ОТПРАВКА В ЛОГ =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith('send_')) {

    const type = interaction.customId.split('_')[1];
    const nick = interaction.fields.getTextInputValue('nick');
    const proof = interaction.fields.getTextInputValue('proof');

    const channel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('📸 Новый отчёт')
      .setDescription(`Тип: ${type}\nНик: ${nick}\n${proof}`)
      .setFooter({ text: interaction.user.id });

    const btn = new ButtonBuilder()
      .setCustomId(`give_${interaction.user.id}_${type}`)
      .setLabel('✅ Начислить')
      .setStyle(ButtonStyle.Success);

    await channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });

    return interaction.reply({ content: 'Отправлено!', flags: MessageFlags.Ephemeral });
  }


  // ===== НАЧИСЛЕНИЕ =====
  if (interaction.isButton() && interaction.customId.startsWith('give_')) {

    await interaction.deferUpdate();

    const [, id, type] = interaction.customId.split('_');
    const points = SCORES[type];

    db[id] = (db[id] || 0) + points;
    saveDB();

    const member = await interaction.guild.members.fetch(id);
    await member.send(`🎉 Тебе начислено ${points} мак-коинов`);

    await interaction.message.edit({ components: [] });
  }

});


// ================= ЛОГИН =================
client.login(process.env.BOT_TOKEN);
