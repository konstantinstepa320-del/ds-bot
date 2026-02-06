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
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');

const fs = require('fs');

const APPLY_CHANNEL_ID = "1469158146500198645";
const POINTS_CHANNEL_ID = "1464632454697455737";

const IMAGE_URL = "https://i.imgur.com/8Km9tLL.png";


// ================= БАЛЛЫ =================

const DB = "./points.json";
let data = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : {};

function save() {
  fs.writeFileSync(DB, JSON.stringify(data));
}

function add(id, n) {
  if (!data[id]) data[id] = 0;
  data[id] += n;
  save();
}

function get(id) {
  return data[id] || 0;
}


// ================= БОТ =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('clientReady', () => {
  console.log('Бот готов');
});


// ================= КОМАНДЫ =================

client.on('messageCreate', async msg => {
  if (msg.author.bot) return;


  // ===== ЗАЯВКА =====
  if (msg.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setImage(IMAGE_URL)
      .setTitle('📩 Подать заявку')
      .setDescription('Нажми кнопку');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать')
      .setStyle(ButtonStyle.Primary);

    msg.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== ПОВЫШЕНИЕ =====
  if (msg.content === '!повышение') {

    const embed = new EmbedBuilder()
      .setImage(IMAGE_URL)
      .setTitle('📈 Система повышения')
      .setDescription(`
Тут ты можешь получать баллы:

+2 Трасса
+3 Дроп
+4 Капт
+2 Тайник
+1 Топ 1
+3 МП
-50 Варн
`);

    const btn = new ButtonBuilder()
      .setCustomId('points')
      .setLabel('Получить баллы')
      .setStyle(ButtonStyle.Success);

    msg.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== МОИ БАЛЛЫ =====
  if (msg.content === '!баллы') {
    msg.reply(`У тебя ${get(msg.author.id)} баллов`);
  }
});


// ================= ИНТЕРАКЦИИ =================

client.on('interactionCreate', async i => {

  // ===== КНОПКА ЗАЯВКИ =====
  if (i.isButton() && i.customId === 'apply') {

    const modal = new ModalBuilder()
      .setCustomId('form')
      .setTitle('Заявка');

    const row = (id, label, style) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
      );

    modal.addComponents(
      row('nick','Ник / Имя / Возраст',TextInputStyle.Short),
      row('online','Онлайн / уровень',TextInputStyle.Short),
      row('fam','Семьи',TextInputStyle.Paragraph),
      row('where','Как узнал',TextInputStyle.Short),
      row('skills','Навыки',TextInputStyle.Paragraph)
    );

    return i.showModal(modal);
  }


  // ===== ОТПРАВКА ЗАЯВКИ =====
  if (i.isModalSubmit()) {

    const ch = i.guild.channels.cache.get(APPLY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle('📨 Новая заявка')
      .setDescription(`${i.user}`);

    ch.send({ embeds: [embed] });

    return i.reply({
      content: 'Заявка отправлена',
      flags: MessageFlags.Ephemeral
    });
  }


  // ===== КНОПКА БАЛЛОВ =====
  if (i.isButton() && i.customId === 'points') {

    const menu = new StringSelectMenuBuilder()
      .setCustomId('select')
      .addOptions([
        { label:'Трасса +2', value:'2' },
        { label:'Дроп +3', value:'3' },
        { label:'Капт +4', value:'4' },
        { label:'Тайник +2', value:'2' },
        { label:'Топ 1 +1', value:'1' },
        { label:'МП +3', value:'3' },
        { label:'Варн -50', value:'-50' }
      ]);

    return i.reply({
      content:'Выбери действие:',
      components:[new ActionRowBuilder().addComponents(menu)],
      flags:MessageFlags.Ephemeral
    });
  }


  // ===== НАЧИСЛЕНИЕ =====
  if (i.isStringSelectMenu()) {

    const amount = Number(i.values[0]);

    add(i.user.id, amount);

    const total = get(i.user.id);

    const log = i.guild.channels.cache.get(POINTS_CHANNEL_ID);
    log.send(`${i.user.tag} ${amount} | ${total}`);

    return i.reply({
      content:`Теперь у тебя ${total} баллов`,
      flags:MessageFlags.Ephemeral
    });
  }

});


client.login(process.env.BOT_TOKEN);
