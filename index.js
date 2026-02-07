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


// =================================================
//                   НАСТРОЙКИ
// =================================================
const TOKEN = process.env.TOKEN;

const APPLY_CHANNEL_ID = "1469158146500198645"; // канал заявок
const PROMO_CHANNEL_ID = "1469477344161959957"; // канал повышения
const LOG_CHANNEL_ID   = "1469477344161959957"; // логи коинов

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";
const ADMIN_ROLE_NAME = "Hight";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";

const COINS_FILE = "./coins.json";
// =================================================



// =================================================
//                  МАККОИНЫ
// =================================================
function loadCoins() {
  if (!fs.existsSync(COINS_FILE)) fs.writeFileSync(COINS_FILE, '{}');
  return JSON.parse(fs.readFileSync(COINS_FILE));
}

function saveCoins(data) {
  fs.writeFileSync(COINS_FILE, JSON.stringify(data, null, 2));
}

function getCoins(id) {
  return loadCoins()[id] || 0;
}

function addCoins(id, amount) {
  const data = loadCoins();
  if (!data[id]) data[id] = 0;
  data[id] += amount;
  if (data[id] < 0) data[id] = 0;
  saveCoins(data);
}
// =================================================



const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});



// =================================================
//                   ЗАПУСК
// =================================================
client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});



// =================================================
//                   КОМАНДЫ
// =================================================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ========= !заявка =========
  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription('Нажми кнопку ниже, чтобы подать заявку');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    return message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ========= !повышение =========
  if (message.content === '!повышение' && message.channel.id === PROMO_CHANNEL_ID) {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('💎 Система маккоинов');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('coins_request').setLabel('💰 Получить').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('coins_balance').setLabel('📊 Баланс').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('coins_add_admin').setLabel('➕ Выдать').setStyle(ButtonStyle.Danger)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});



// =================================================
//                ИНТЕРАКЦИИ
// =================================================
client.on('interactionCreate', async interaction => {

  // =================================================
  //                  ЗАЯВКИ
  // =================================================

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
      input('nick', 'Ник / Возраст', TextInputStyle.Short),
      input('online', 'Онлайн', TextInputStyle.Short),
      input('fam', 'Семьи', TextInputStyle.Paragraph)
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
        { name: 'Игрок', value: `${interaction.user}` },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`watch_${interaction.user.id}`).setLabel('👀 Смотрю').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel('📞 Обзвон').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: 'Заявка отправлена', flags: MessageFlags.Ephemeral });
  }



  // =================================================
  //                МАККОИНЫ
  // =================================================

  if (interaction.customId === 'coins_balance') {
    return interaction.reply({
      content: `💰 Баланс: ${getCoins(interaction.user.id)}`,
      flags: MessageFlags.Ephemeral
    });
  }


  // заявка на коин
  if (interaction.customId === 'coins_request') {

    const modal = new ModalBuilder()
      .setCustomId('coinsRequestModal')
      .setTitle('Запрос коинов');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('amount').setLabel('Сколько коинов?').setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }


  // отправка в лог
  if (interaction.isModalSubmit() && interaction.customId === 'coinsRequestModal') {

    const amount = interaction.fields.getTextInputValue('amount');
    const channel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`approve_${interaction.user.id}_${amount}`).setLabel('✅ Начислить').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel('❌ Отказать').setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `${interaction.user} просит ${amount} коинов`,
      components: [row]
    });

    return interaction.reply({ content: 'Отправлено на проверку', flags: MessageFlags.Ephemeral });
  }


  // начисление (ТОЛЬКО Hight)
  if (interaction.customId?.startsWith('approve_')) {

    if (!interaction.member.roles.cache.some(r => r.name === ADMIN_ROLE_NAME))
      return interaction.reply({ content: '❌ Только роль Hight', flags: MessageFlags.Ephemeral });

    const [_, id, amount] = interaction.customId.split('_');
    addCoins(id, parseInt(amount));

    return interaction.update({ content: 'Начислено', components: [] });
  }
});



client.login(TOKEN);