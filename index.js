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

// заявки
const APPLY_CHANNEL_ID = "1469158146500198645";

// проверка баллов (принять/отказать)
const POINTS_REVIEW_CHANNEL_ID = "1469477344161959957";

// панель повышения
const UPGRADE_CHANNEL_ID = "1464632454697455737";

// узнать свои баллы
const POINTS_PANEL_CHANNEL_ID = "1469478344772026409";

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";


// ================= БАЗА БАЛЛОВ =================
const DB_FILE = "./points.json";

let points = {};
if (fs.existsSync(DB_FILE)) {
  points = JSON.parse(fs.readFileSync(DB_FILE));
}

function addPoints(id, amount) {
  if (!points[id]) points[id] = 0;
  points[id] += amount;
  fs.writeFileSync(DB_FILE, JSON.stringify(points, null, 2));
}

function getPoints(id) {
  return points[id] || 0;
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


// ======================================================
//                     ЗАЯВКИ (ТВОЯ СИСТЕМА)
// ======================================================

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription('👇 Нажми кнопку ниже, чтобы подать заявку');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    await message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // панель повышения
  if (message.content === '!повышение') {

    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setImage(IMAGE_URL)
      .setTitle('⭐ Система повышения')
      .setDescription(
`Выбери действие и отправь доказательства:

Тайник — 2  
Дроп — 3  
Капт — 4  
Трасса — 2  
МП — 3  
Варн — -50`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('p_2').setLabel('🧰 Тайник +2').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p_3').setLabel('📦 Дроп +3').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p_4').setLabel('⚔ Капт +4').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p_warn').setLabel('⚠ Варн -50').setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }


  // панель баллов
  if (message.content === '!баллыпанель') {

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setImage(IMAGE_URL)
      .setTitle('📊 Проверка баллов');

    const btn = new ButtonBuilder()
      .setCustomId('my_points')
      .setLabel('Сколько у меня баллов')
      .setStyle(ButtonStyle.Primary);

    await message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }
});


// ======================================================
//                     ИНТЕРАКЦИИ
// ======================================================

client.on('interactionCreate', async interaction => {

  // ---------- мои баллы ----------
  if (interaction.isButton() && interaction.customId === 'my_points') {
    return interaction.reply({
      content: `📊 У тебя: ${getPoints(interaction.user.id)} баллов`,
      flags: MessageFlags.Ephemeral
    });
  }


  // ---------- отправка на проверку ----------
  if (interaction.isButton() && interaction.customId.startsWith('p_')) {

    let amount = 0;

    if (interaction.customId === 'p_2') amount = 2;
    if (interaction.customId === 'p_3') amount = 3;
    if (interaction.customId === 'p_4') amount = 4;
    if (interaction.customId === 'p_warn') amount = -50;

    const channel = await interaction.guild.channels.fetch(POINTS_REVIEW_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setImage(IMAGE_URL)
      .setTitle('📩 Запрос на баллы')
      .setDescription(`${interaction.user} просит ${amount > 0 ? '+' : ''}${amount} баллов`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pa_${interaction.user.id}_${amount}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`pr_${interaction.user.id}`).setLabel('❌ Отказать').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: '✅ Отправлено на проверку', flags: MessageFlags.Ephemeral });
  }


  // ---------- принять баллы ----------
  if (interaction.isButton() && interaction.customId.startsWith('pa_')) {

    const [_, id, amount] = interaction.customId.split('_');

    addPoints(id, parseInt(amount));

    const member = await interaction.guild.members.fetch(id);

    await member.send(`🎉 Вам начислено ${amount} баллов\nТеперь у вас: ${getPoints(id)}`);

    return interaction.update({ content: '✅ Принято', components: [] });
  }


  // ---------- отказ ----------
  if (interaction.isButton() && interaction.customId.startsWith('pr_')) {

    const id = interaction.customId.split('_')[1];
    const member = await interaction.guild.members.fetch(id);

    await member.send('❌ Вам отказали в начислении баллов');

    return interaction.update({ content: '❌ Отклонено', components: [] });
  }

});


// ======================================================

client.login(process.env.BOT_TOKEN);
