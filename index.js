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

const APPLY_CHANNEL_ID = "1469158146500198645";
const POINTS_CHANNEL_ID = "1464632454697455737";
const IMAGE_URL = "https://i.imgur.com/8Km9tLL.png";


// ================= БАЛЛЫ =================

const DB = "./points.json";
let points = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : {};

function save() {
  fs.writeFileSync(DB, JSON.stringify(points));
}

function add(id, n) {
  if (!points[id]) points[id] = 0;
  points[id] += n;
  save();
}

function get(id) {
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

client.once('clientReady', () => {
  console.log("Бот готов");
});


// ================= КОМАНДЫ =================

client.on('messageCreate', async msg => {
  if (msg.author.bot) return;


  // ========= ПАНЕЛЬ ЗАЯВКИ =========
  if (msg.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setImage(IMAGE_URL)
      .setTitle('📩 Подать заявку')
      .setDescription('Нажми кнопку ниже');

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    msg.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ========= ПАНЕЛЬ ПОВЫШЕНИЯ =========
  if (msg.content === '!повышение') {

    const embed = new EmbedBuilder()
      .setImage(IMAGE_URL)
      .setTitle('📈 Система повышения')
      .setDescription(`
🚗 Трасса +2
📦 Дроп +3
⚔️ Капт +4
🔐 Тайник +2
🥇 Топ 1 +1
🎮 МП +3
❌ Варн -50
`);

    const btn = new ButtonBuilder()
      .setCustomId('points_open')
      .setLabel('Получить баллы')
      .setStyle(ButtonStyle.Success);

    msg.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  if (msg.content === '!баллы') {
    msg.reply(`У тебя ${get(msg.author.id)} баллов`);
  }
});


// ================= ИНТЕРАКЦИИ =================

client.on('interactionCreate', async i => {

  // ========= КНОПКА ЗАЯВКИ =========
  if (i.isButton() && i.customId === 'apply') {

    const modal = new ModalBuilder()
      .setCustomId('apply_form')
      .setTitle('Заявка');

    const row = (id, label, style) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(true)
      );

    modal.addComponents(
      row('nick','Ник / Имя / Возраст',TextInputStyle.Short),
      row('online','Суточный онлайн и уровень',TextInputStyle.Short),
      row('fam','В каких семьях были?',TextInputStyle.Paragraph),
      row('where','Как узнал о семье?',TextInputStyle.Short),
      row('skills','Откат тяги / спешик',TextInputStyle.Paragraph)
    );

    return i.showModal(modal);
  }


  // ========= ОТПРАВКА ЗАЯВКИ =========
  if (i.isModalSubmit() && i.customId === 'apply_form') {

    const channel = i.guild.channels.cache.get(APPLY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle('📨 Новая заявка')
      .addFields(
        { name:'👤 Пользователь', value:`${i.user}` },
        { name:'Ник', value:i.fields.getTextInputValue('nick') },
        { name:'Онлайн', value:i.fields.getTextInputValue('online') },
        { name:'Семьи', value:i.fields.getTextInputValue('fam') },
        { name:'Откуда узнал', value:i.fields.getTextInputValue('where') },
        { name:'Навыки', value:i.fields.getTextInputValue('skills') }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`watch_${i.user.id}`).setLabel('👀 Смотрю').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`call_${i.user.id}`).setLabel('📞 Обзвон').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`accept_${i.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${i.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger),
    );

    await channel.send({ embeds:[embed], components:[row] });

    return i.reply({ content:'Заявка отправлена', flags:MessageFlags.Ephemeral });
  }


  // ========= КНОПКИ ЗАЯВОК (БЕЗ ОГРАНИЧЕНИЙ) =========
  if (i.isButton() && i.customId.startsWith('watch_')) {
    const id = i.customId.split('_')[1];
    const m = await i.guild.members.fetch(id);
    m.send('👀 Твою заявку смотрят');
    return i.reply({ content:'Отмечено', flags:MessageFlags.Ephemeral });
  }

  if (i.isButton() && i.customId.startsWith('call_')) {
    const id = i.customId.split('_')[1];
    const m = await i.guild.members.fetch(id);
    m.send('📞 Тебя вызывают на обзвон');
    return i.reply({ content:'Вызван', flags:MessageFlags.Ephemeral });
  }

  if (i.isButton() && i.customId.startsWith('accept_')) {
    return i.update({ content:'✅ Принято', components:[] });
  }

  if (i.isButton() && i.customId.startsWith('reject_')) {
    return i.update({ content:'❌ Отклонено', components:[] });
  }


  // ========= СИСТЕМА БАЛЛОВ =========
  if (i.isButton() && i.customId === 'points_open') {

    const modal = new ModalBuilder()
      .setCustomId('points_form')
      .setTitle('Получить баллы');

    const row = (id, label) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      );

    modal.addComponents(
      row('type','Что сделал?'),
      row('nick','Ник'),
      row('proof','Ссылка на скрин')
    );

    return i.showModal(modal);
  }


  if (i.isModalSubmit() && i.customId === 'points_form') {

    const map = {
      "трасса":2,"дроп":3,"капт":4,"тайник":2,"топ":1,"мп":3,"варн":-50
    };

    const type = i.fields.getTextInputValue('type').toLowerCase();
    const val = map[type] || 0;

    const channel = i.guild.channels.cache.get(POINTS_CHANNEL_ID);

    const btn = new ButtonBuilder()
      .setCustomId(`confirm_${i.user.id}_${val}`)
      .setLabel('✅ Подтвердить')
      .setStyle(ButtonStyle.Success);

    await channel.send({
      content:`${i.user} | ${type} | ${val}`,
      components:[new ActionRowBuilder().addComponents(btn)]
    });

    return i.reply({ content:'Отправлено на проверку', flags:MessageFlags.Ephemeral });
  }


  if (i.isButton() && i.customId.startsWith('confirm_')) {

    const [ , id, val ] = i.customId.split('_');

    add(id, Number(val));

    const total = get(id);

    const m = await i.guild.members.fetch(id);
    m.send(`Тебе начислено ${val}\nВсего: ${total}`);

    return i.update({ content:`Начислено ${val}`, components:[] });
  }

});


client.login(process.env.BOT_TOKEN);
