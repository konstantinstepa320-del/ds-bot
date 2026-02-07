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
const LOG_CHANNEL_ID = "1469477344161959957";

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";
const ADMIN_ROLE = "Hight";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";

const WARN_PRICE = 70;
const DB = "./coins.json";
// ============================================


// ================= БАЗА =================
if (!fs.existsSync(DB)) fs.writeFileSync(DB, "{}");

const read = () => JSON.parse(fs.readFileSync(DB));
const save = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));

function coins(id) {
  return read()[id] || 0;
}

function addCoins(id, amount) {
  const d = read();
  d[id] = (d[id] || 0) + amount;
  save(d);
}
// =========================================


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
      .setDescription('Нажми кнопку ниже, чтобы подать заявку');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== !повышение =====
  if (message.content === '!повышение') {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('get').setLabel('💰 Получить').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('balance').setLabel('📊 Баланс').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop').setLabel('🛒 Снять варн (70)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('give').setLabel('➕ Выдать').setStyle(ButtonStyle.Danger)
    );

    message.channel.send({
      content: "Система баллов",
      components: [row]
    });
  }
});


// =================================================
// ================= ИНТЕРАКЦИИ ====================
// =================================================
client.on('interactionCreate', async interaction => {

  // =================================================
  // ================= ЗАЯВКИ ========================
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
      .addFields(
        { name: '👤 Пользователь', value: `${interaction.user}` },
        { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
        { name: 'Онлайн', value: interaction.fields.getTextInputValue('online') },
        { name: 'Семьи', value: interaction.fields.getTextInputValue('fam') },
        { name: 'Откуда узнал', value: interaction.fields.getTextInputValue('where') },
        { name: 'Откат', value: interaction.fields.getTextInputValue('skills') }
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


  // =================================================
  // ================= БАЛЛЫ =========================
  // =================================================

  if (interaction.isButton() && interaction.customId === 'balance') {
    return interaction.reply({ content: `Баланс: ${coins(interaction.user.id)}`, flags: MessageFlags.Ephemeral });
  }

  if (interaction.isButton() && interaction.customId === 'shop') {

    if (coins(interaction.user.id) < WARN_PRICE)
      return interaction.reply({ content: 'Недостаточно баллов', flags: MessageFlags.Ephemeral });

    addCoins(interaction.user.id, -WARN_PRICE);

    return interaction.reply({ content: 'Варн снят!', flags: MessageFlags.Ephemeral });
  }


  // ===== ВЫДАТЬ (ТОЛЬКО Hight) =====
  if (interaction.isButton() && interaction.customId === 'give') {

    if (!interaction.member.roles.cache.some(r => r.name === ADMIN_ROLE))
      return interaction.reply({ content: 'Нет доступа', flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder()
      .setCustomId('giveModal')
      .setTitle('Выдать баллы');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id').setLabel('ID пользователя').setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('amount').setLabel('Количество').setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }


  if (interaction.isModalSubmit() && interaction.customId === 'giveModal') {

    const id = interaction.fields.getTextInputValue('id');
    const amount = Number(interaction.fields.getTextInputValue('amount'));

    addCoins(id, amount);

    return interaction.reply({ content: `Выдано ${amount} баллов`, flags: MessageFlags.Ephemeral });
  }

});

client.login(process.env.TOKEN);
