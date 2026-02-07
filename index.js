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
const TOKEN = process.env.TOKEN;

const APPLY_CHANNEL_ID = "1469158146500198645"; // заявки
const PROMO_CHANNEL_ID = "1464632454697455737"; // канал !повышение
const LOG_CHANNEL_ID = "1469477344161959957"; // логи маккоинов

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";

const ADMIN_ROLE_NAME = "Hight"; // только эта роль может выдавать

const WARN_REMOVE_PRICE = 10;

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";

const COINS_FILE = "./coins.json";
// ============================================



// ================= ВАЛЮТА =================
function loadCoins() {
  if (!fs.existsSync(COINS_FILE)) fs.writeFileSync(COINS_FILE, '{}');
  return JSON.parse(fs.readFileSync(COINS_FILE));
}

function saveCoins(data) {
  fs.writeFileSync(COINS_FILE, JSON.stringify(data, null, 2));
}

function getCoins(id) {
  const data = loadCoins();
  return data[id] || 0;
}

function addCoins(id, amount) {
  const data = loadCoins();
  if (!data[id]) data[id] = 0;

  data[id] += amount;
  if (data[id] < 0) data[id] = 0;

  saveCoins(data);
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



// ================= ЗАПУСК =================
client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});



// =================================================
// ================== КОМАНДЫ ======================
// =================================================
client.on('messageCreate', async message => {

  if (message.author.bot) return;



  // ================= ЗАЯВКА =================
  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription(`
• Все заявки отправляются администрации
• Ответ обычно в течение 24 часов

👇 Нажми кнопку ниже, чтобы подать заявку
`);

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    return message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }



  // ================= ПОВЫШЕНИЕ =================
  if (message.content === '!повышение' && message.channel.id === PROMO_CHANNEL_ID) {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('💎 Система маккоинов')
      .setImage(IMAGE_URL)
      .setDescription(`
🏆 **Начисления**
• Капт — 3
• Трасса — 2
• МП — 2
• Арена — 1
• Тайник — 2
`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('coins_request').setLabel('💰 Получить').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('coins_balance').setLabel('📊 Баланс').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('coins_shop').setLabel('🛒 Магазин').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('coins_add_admin').setLabel('➕ Выдать').setStyle(ButtonStyle.Danger)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

});



// =================================================
// ================= ИНТЕРАКЦИИ ====================
// =================================================
client.on('interactionCreate', async interaction => {

  // ================= БАЛАНС =================
  if (interaction.isButton() && interaction.customId === 'coins_balance') {
    return interaction.reply({
      content: `💰 У тебя **${getCoins(interaction.user.id)} маккоинов**`,
      flags: MessageFlags.Ephemeral
    });
  }



  // ================= ЗАПРОС КОИНОВ =================
  if (interaction.isButton() && interaction.customId === 'coins_request') {

    const modal = new ModalBuilder()
      .setCustomId('coinsRequestModal')
      .setTitle('Запрос маккоинов');

    const input = (id, label, style) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(true)
      );

    modal.addComponents(
      input('type', 'Тип (капт/мп/трасса/арена/тайник)', TextInputStyle.Short),
      input('count', 'Сколько раз', TextInputStyle.Short),
      input('proof', 'Доказательства', TextInputStyle.Paragraph)
    );

    return interaction.showModal(modal);
  }



  // ================= ОТПРАВКА В ЛОГ =================
  if (interaction.isModalSubmit() && interaction.customId === 'coinsRequestModal') {

    const prices = { капт:3, трасса:2, мп:2, арена:1, тайник:2 };

    const type = interaction.fields.getTextInputValue('type').toLowerCase();
    const count = parseInt(interaction.fields.getTextInputValue('count'));
    const proof = interaction.fields.getTextInputValue('proof');

    const total = (prices[type] || 0) * count;

    const channel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('📩 Запрос маккоинов')
      .addFields(
        { name: 'Игрок', value: `${interaction.user}` },
        { name: 'Тип', value: type },
        { name: 'Кол-во', value: `${count}` },
        { name: 'К выдаче', value: `${total}` },
        { name: 'Доказательства', value: proof }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`approve_${interaction.user.id}_${total}`).setLabel('✅ Начислить').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel('❌ Отказать').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: '✅ Отправлено на проверку', flags: MessageFlags.Ephemeral });
  }



  // ================= ОДОБРИТЬ =================
  if (interaction.isButton() && interaction.customId.startsWith('approve_')) {

    const [_, id, amount] = interaction.customId.split('_');

    addCoins(id, parseInt(amount));

    return interaction.update({ content: `✅ Начислено ${amount}`, components: [] });
  }



  // ================= ОТКАЗ =================
  if (interaction.isButton() && interaction.customId.startsWith('deny_')) {
    return interaction.update({ content: '❌ Отклонено', components: [] });
  }



  // ================= ВЫДАЧА (ТОЛЬКО Hight) =================
  if (interaction.isButton() && interaction.customId === 'coins_add_admin') {

    const hasRole = interaction.member.roles.cache.some(r => r.name === ADMIN_ROLE_NAME);

    if (!hasRole)
      return interaction.reply({ content: '❌ Только роль Hight может выдавать', flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder()
      .setCustomId('addCoinsModal')
      .setTitle('Выдать маккоины');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('user').setLabel('ID').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('amount').setLabel('Количество').setStyle(TextInputStyle.Short).setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }



  if (interaction.isModalSubmit() && interaction.customId === 'addCoinsModal') {

    addCoins(
      interaction.fields.getTextInputValue('user'),
      parseInt(interaction.fields.getTextInputValue('amount'))
    );

    return interaction.reply({ content: '✅ Выдано', flags: MessageFlags.Ephemeral });
  }

});



client.login(TOKEN);