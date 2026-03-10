const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require("discord.js");
const fs = require("fs");

/* ================= [ НАСТРОЙКИ ] ================= */
const CONFIG = {
  // Настройки для ЗАЯВОК
  COMMAND_CHANNEL_ID: "1480220429988659251", // Где пишут !заявка
  APPLY_CHANNEL_ID: "1480227101905785113",   // Куда падают анкеты админам
  ROLE_ACCEPTED_ID: "1479557914086740104",   // Роль при принятии анкеты

  // Настройки для БАЛЛОВ
  ALLOWED_GUILD_ID: "1046807733501968404",
  EARN_CHANNEL: "1479571004471640155",
  LEVEL_CHANNEL: "1480228317222277171",
  ROLE_LEADER_ID: "1056945517835341936",
  ROLE_HIGH_ID: "1295017864310423583",
  MEIN_ROLE_ID: "1480229891789160479", 
  MEIN_PLUS_ROLE_ID: "1479574658935423087",

  IMAGE: "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png",
};

const RANK_COSTS = { "3": 89, "4": 178 };

/* ================= [ БАЗА ДАННЫХ ] ================= */
let db = { points: {}, earnLogs: {} };
if (fs.existsSync("db.json")) db = JSON.parse(fs.readFileSync("db.json"));

function save() { fs.writeFileSync("db.json", JSON.stringify(db, null, 2)); }
function addPoints(id, amount) {
  db.points[id] = (db.points[id] || 0) + amount;
  save();
}
function getPoints(id) { return db.points[id] || 0; }

/* ================= [ КЛИЕНТ ] ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once("ready", () => {
  console.log(`✅ Бот ${client.user.tag} успешно запущен и объединил 2 системы!`);
});

/* ================= [ ОБРАБОТКА КОМАНД ] ================= */
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  // Команда !give (из 2-го кода)
  if (msg.content.startsWith("!give")) {
    if (!msg.member.roles.cache.has(CONFIG.ROLE_LEADER_ID)) return msg.reply("❌ Нет прав (Leader)");
    const user = msg.mentions.users.first();
    const amount = parseInt(msg.content.split(" ")[2]);
    if (!user || isNaN(amount)) return msg.reply("Используй: !give @user 50");
    addPoints(user.id, amount);
    return msg.reply(`✅ Выдано ${amount} 💎`);
  }

  // Команда !menu (из 2-го кода)
  if (msg.content === "!menu") {
    const embed = new EmbedBuilder()
      .setTitle("💎 Система баллов")
      .setDescription("Зарабатывай баллы и подавай заявку на повышение.")
      .setImage(CONFIG.IMAGE);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("earn_btn").setLabel("Зарабатывать").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("balance_btn").setLabel("Баланс").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("rankup_btn").setLabel("Повышаться").setStyle(ButtonStyle.Success),
    );
    return msg.reply({ embeds: [embed], components: [row] });
  }

  // Команда !заявка (из 1-го кода)
  if (msg.content === "!заявка" && msg.channel.id === CONFIG.COMMAND_CHANNEL_ID) {
    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(CONFIG.IMAGE)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription(`• Все заявки отправляются администрации\n• Ответ обычно в течение 24 часов\n\n👇 Нажми кнопку ниже, чтобы подать заявку`);
    const btn = new ButtonBuilder().setCustomId('apply').setLabel('Подать заявку').setStyle(ButtonStyle.Primary);
    return msg.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
});

/* ================= [ ИНТЕРАКЦИИ (Кнопки и Модалки) ] ================= */
client.on("interactionCreate", async i => {
  try {
    // --- СЕКЦИЯ: ЗАЯВКИ ( Recruitment ) ---
    if (i.isButton() && i.customId === 'apply') {
      const modal = new ModalBuilder().setCustomId('applyModal').setTitle('Заявка');
      const input = (id, label, style) => new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(true)
      );
      modal.addComponents(
        input('nick', 'Ник / Имя / Возраст', TextInputStyle.Short),
        input('online', 'Суточный онлайн и уровень', TextInputStyle.Short),
        input('fam', 'В каких семьях были?', TextInputStyle.Paragraph),
        input('where', 'Как узнал о семье?', TextInputStyle.Short),
        input('skills', 'Откат тяги / спешик', TextInputStyle.Paragraph)
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === 'applyModal') {
      const channel = await i.guild.channels.fetch(CONFIG.APPLY_CHANNEL_ID);
      const embed = new EmbedBuilder()
        .setColor('DarkRed').setTitle('📩 Новая заявка')
        .addFields(
          { name: '👤 Пользователь', value: `${i.user}` },
          { name: 'Ник', value: i.fields.getTextInputValue('nick') },
          { name: 'Онлайн', value: i.fields.getTextInputValue('online') },
          { name: 'Семьи', value: i.fields.getTextInputValue('fam') },
          { name: 'Откуда узнал', value: i.fields.getTextInputValue('where') },
          { name: 'Откат / спешик', value: i.fields.getTextInputValue('skills') }
        );
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`watch_${i.user.id}`).setLabel('👀 Смотрю').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`call_${i.user.id}`).setLabel('📞 Обзвон').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`accept_${i.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${i.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger)
      );
      await channel.send({ embeds: [embed], components: [row] });
      return i.reply({ content: '✅ Заявка отправлена!', flags: MessageFlags.Ephemeral });
    }

    // Обработка кнопок админа для ЗАЯВОК (watch, call, accept, reject)
    if (i.isButton()) {
      const [action, userId] = i.customId.split('_');
      if (['watch', 'call', 'accept', 'reject'].includes(action)) {
        const member = await i.guild.members.fetch(userId).catch(() => null);
        if (!member) return i.reply({ content: "Юзер не найден", ephemeral: true });

        if (action === 'watch') {
          await member.send('👀 Ваша заявка взята на рассмотрение!').catch(() => {});
          return i.reply({ content: '👀 Вы взяли заявку', ephemeral: true });
        }
        if (action === 'call') {
          await member.send('📞 Вас вызывают на обзвон!').catch(() => {});
          return i.reply({ content: '📞 Пользователь вызван', ephemeral: true });
        }
        if (action === 'accept') {
          const role = i.guild.roles.cache.get(CONFIG.ROLE_ACCEPTED_ID);
          if (role) await member.roles.add(role);
          await member.send('🎉 Поздравляем! Ваша заявка принята.').catch(() => {});
          return i.update({ content: '✅ Принято', components: [] });
        }
        if (action === 'reject') {
          const modal = new ModalBuilder().setCustomId(`rejectReason_${userId}`).setTitle('Причина отказа');
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('reason').setLabel('Причина').setStyle(TextInputStyle.Paragraph).setRequired(true)
          ));
          return i.showModal(modal);
        }
      }
    }

    if (i.isModalSubmit() && i.customId.startsWith('rejectReason_')) {
      const id = i.customId.split('_')[1];
      const member = await i.guild.members.fetch(id).catch(() => null);
      const reason = i.fields.getTextInputValue('reason');
      if (member) await member.send(`❌ Ваша заявка отклонена.\nПричина: ${reason}`).catch(() => {});
      return i.update({ content: `❌ Отклонено\nПричина: ${reason}`, components: [] });
    }

    // --- СЕКЦИЯ: БАЛЛЫ И ПОВЫШЕНИЕ ( Points System ) ---
    if (i.isButton() && i.customId === "balance_btn") {
      return i.reply({ content: `💎 Твой баланс: ${getPoints(i.user.id)}`, ephemeral: true });
    }

    if (i.isButton() && i.customId === "earn_btn") {
      if (i.channelId !== CONFIG.EARN_CHANNEL) return i.reply({ content: `❌ Только в <#${CONFIG.EARN_CHANNEL}>`, ephemeral: true });
      const embed = new EmbedBuilder().setTitle("💰 Выбери способ заработка")
        .setDescription("**Капт** — 3 💎\n**Траса** — 2 💎\n**Топ 1 на арене** — 2 💎\n**Развоз грина** — 1 💎\n**Тайник** — 2 💎\n**Заправка машин** — 2 💎");
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("earn_capt").setLabel("Капт (3💎)").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("earn_trasa").setLabel("Траса (2💎)").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("earn_arena").setLabel("Арена (2💎)").setStyle(ButtonStyle.Primary),
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("earn_grin").setLabel("Грин (1💎)").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("earn_taynik").setLabel("Тайник (2💎)").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("earn_zapravka").setLabel("Заправка (2💎)").setStyle(ButtonStyle.Secondary),
      );
      return i.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }

    const earnTypes = {
      "earn_capt": { name: "Капт", points: 3 },
      "earn_trasa": { name: "Траса", points: 2 },
      "earn_arena": { name: "Топ 1 на арене", points: 2 },
      "earn_grin": { name: "Развоз грина", points: 1 },
      "earn_taynik": { name: "Тайник", points: 2 },
      "earn_zapravka": { name: "Заправка машин", points: 2 },
    };

    if (earnTypes[i.customId]) {
      const type = earnTypes[i.customId];
      const modal = new ModalBuilder().setCustomId(`earnmodal_${i.customId}`).setTitle(type.name);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("earn_nick").setLabel("Ник").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("earn_proof").setLabel("Скрин").setStyle(TextInputStyle.Paragraph).setRequired(true)),
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("earnmodal_")) {
      const earnType = i.customId.replace("earnmodal_", "");
      const type = earnTypes[earnType];
      const nick = i.fields.getTextInputValue("earn_nick");
      const proof = i.fields.getTextInputValue("earn_proof");
      const channel = await i.guild.channels.fetch(CONFIG.LEVEL_CHANNEL);
      const embed = new EmbedBuilder().setTitle("💰 Заявка на баллы")
        .addFields({ name: "Игрок", value: `${i.user}` }, { name: "Тип", value: type.name }, { name: "Скрин", value: proof });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`points_ok_${i.user.id}_${type.points}`).setLabel("✅ Выдать").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`points_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger),
      );
      await channel.send({ embeds: [embed], components: [row] });
      return i.reply({ content: "✅ Отправлено!", ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("points_ok_")) {
      const [, , userId, pts] = i.customId.split("_");
      addPoints(userId, Number(pts));
      await i.message.edit({ components: [] });
      return i.reply({ content: "✅ Баллы выданы", ephemeral: true });
    }

    if (i.isButton() && i.customId === "rankup_btn") {
      const modal = new ModalBuilder().setCustomId("rankup_modal").setTitle("Повышение");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("rankup_nick").setLabel("Ник").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("rankup_proof").setLabel("Откат").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("rankup_target").setLabel("Ранг (3 или 4)").setStyle(TextInputStyle.Short).setRequired(true)),
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "rankup_modal") {
      const nick = i.fields.getTextInputValue("rankup_nick");
      const proof = i.fields.getTextInputValue("rankup_proof");
      const target = i.fields.getTextInputValue("rankup_target");
      const cost = RANK_COSTS[target];
      if (!cost || getPoints(i.user.id) < cost) return i.reply({ content: "❌ Недостаточно баллов или неверный ранг", ephemeral: true });
      const channel = await i.guild.channels.fetch(CONFIG.LEVEL_CHANNEL);
      const embed = new EmbedBuilder().setTitle("📝 Заявка на повышение")
        .addFields({ name: "Игрок", value: `${i.user}` }, { name: "Ранг", value: target }, { name: "Откат", value: proof });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rank_ok_${i.user.id}_${cost}_${target}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rank_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger),
      );
      await channel.send({ embeds: [embed], components: [row] });
      return i.reply({ content: "✅ Заявка отправлена!", ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("rank_ok_")) {
      const [, , userId, cost, rank] = i.customId.split("_");
      addPoints(userId, -Number(cost));
      const member = await i.guild.members.fetch(userId);
      if (rank === "3") await member.roles.add(CONFIG.MEIN_ROLE_ID);
      if (rank === "4") await member.roles.add(CONFIG.MEIN_PLUS_ROLE_ID);
      await i.message.edit({ components: [] });
      return i.reply({ content: "✅ Повышен!", ephemeral: true });
    }

  } catch (err) { console.error(err); }
});

client.login(process.env.TOKEN);