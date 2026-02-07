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
const LOG_CHANNEL_ID   = "1469477344161959957"; // логи балов

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";
const ADMIN_ROLE = "Hight";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";

const WARN_PRICE = 70;
const DB_FILE = "./coins.json";
// ============================================



// ================= БАЗА =================
function loadDB(){
  if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE,"{}");
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(d){ fs.writeFileSync(DB_FILE, JSON.stringify(d,null,2)); }

function coins(id){
  const d=loadDB(); return d[id]?.coins||0;
}
function addCoins(id,a){
  const d=loadDB();
  if(!d[id]) d[id]={coins:0,disabled:false};
  d[id].coins+=a;
  saveDB(d);
}
function disableUser(id){
  const d=loadDB();
  if(!d[id]) d[id]={coins:0};
  d[id].disabled=true;
  saveDB(d);
}
function isDisabled(id){
  const d=loadDB(); return d[id]?.disabled;
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
// ================= ТВОЯ СИСТЕМА ЗАЯВОК =================
// =================================================

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ===== !заявка =====
  if (message.content === '!заявка') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setImage(IMAGE_URL)
      .setTitle('👋 Путь в семью начинается здесь!')
      .setDescription(`• Все заявки отправляются администрации\n👇 Нажми кнопку`);

    const btn = new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    await message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }


  // =================================================
  // =============== НОВАЯ СИСТЕМА БАЛОВ =============
  // =================================================

  if (message.content === '!повышение') {

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('💎 Система балов')
      .setImage(IMAGE_URL)
      .setDescription(`Отправляй доказательства → админ проверяет → получаешь балы\nСнятие варна: ${WARN_PRICE}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('get').setLabel('💰 Получить').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('balance').setLabel('📊 Баланс').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop').setLabel('🛒 Магазин').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('give').setLabel('➕ Выдать').setStyle(ButtonStyle.Danger)
    );

    message.channel.send({ embeds:[embed], components:[row] });
  }
});



// =================================================
// ================= ИНТЕРАКЦИИ =================
// =================================================

client.on('interactionCreate', async interaction => {

  // =================================================
  // ============ ТВОЯ СТАРАЯ СИСТЕМА ЗАЯВОК ==========
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

    await channel.send({ embeds:[embed], components:[row] });

    return interaction.reply({ content:'✅ Заявка отправлена', flags:MessageFlags.Ephemeral });
  }



  // =================================================
  // ============== СИСТЕМА БАЛОВ ====================
  // =================================================

  if (interaction.isButton() && interaction.customId === 'balance')
    return interaction.reply({ content:`💰 Баланс: ${coins(interaction.user.id)}`, flags:MessageFlags.Ephemeral });



  if (interaction.isButton() && interaction.customId === 'get') {

    if(isDisabled(interaction.user.id))
      return interaction.reply({content:'❌ Ты отключен',flags:MessageFlags.Ephemeral});

    const modal=new ModalBuilder().setCustomId('proof').setTitle('Доказательства');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('link').setLabel('Ссылка + скрин').setStyle(TextInputStyle.Paragraph)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('amount').setLabel('Сколько балов?').setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }



  if (interaction.isModalSubmit() && interaction.customId==='proof'){

    const log=await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

    const amount=interaction.fields.getTextInputValue('amount');

    const row=new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`approve_${interaction.user.id}_${amount}`).setLabel('✅ Одобрить').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`disable_${interaction.user.id}`).setLabel('🔒 Отключить').setStyle(ButtonStyle.Danger)
    );

    await log.send({
      content:`${interaction.user}\n${interaction.fields.getTextInputValue('link')}`,
      components:[row]
    });

    return interaction.reply({content:'✅ Отправлено',flags:MessageFlags.Ephemeral});
  }



  if(interaction.isButton() && interaction.customId.startsWith('approve_')){
    const[,id,a]=interaction.customId.split('_');
    addCoins(id,Number(a));
    return interaction.update({content:'✅ Начислено',components:[]});
  }



  if(interaction.isButton() && interaction.customId==='give'){

    if(!interaction.member.roles.cache.some(r=>r.name===ADMIN_ROLE))
      return interaction.reply({content:'❌ Нет прав',flags:MessageFlags.Ephemeral});

    const modal=new ModalBuilder().setCustomId('giveModal').setTitle('Выдать балы');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id').setLabel('ID или @').setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('a').setLabel('Сколько').setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }



  if(interaction.isModalSubmit() && interaction.customId==='giveModal'){
    const id=interaction.fields.getTextInputValue('id').replace(/[<@!>]/g,'');
    const a=Number(interaction.fields.getTextInputValue('a'));
    addCoins(id,a);
    return interaction.reply({content:`✅ Выдано ${a}`,flags:MessageFlags.Ephemeral});
  }

});



client.login(process.env.TOKEN);
