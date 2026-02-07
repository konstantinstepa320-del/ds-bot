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
const LOG_CHANNEL_ID   = "1469477344161959957";

const ROLE_1 = "DaSouza";
const ROLE_2 = "Test";
const ADMIN_ROLE = "Hight";

const WARN_PRICE = 70;
const DB_FILE = "./coins.json";
// ============================================



// ================= БАЗА =================
function db(){
  if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE,"{}");
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function save(d){ fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2)); }

function addCoins(id,a){
  const d=db();
  if(!d[id]) d[id]={coins:0,disabled:false};
  d[id].coins+=a;
  save(d);
}
function getCoins(id){
  return db()[id]?.coins||0;
}
function disableUser(id){
  const d=db();
  if(!d[id]) d[id]={coins:0};
  d[id].disabled=true;
  save(d);
}
function isDisabled(id){
  return db()[id]?.disabled;
}
// ============================================



const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready',()=>console.log(`✅ ${client.user.tag} запущен`));



function isAdmin(member){
  return member.roles.cache.some(r=>r.name===ADMIN_ROLE);
}



// =================================================
// ================= КОМАНДЫ =================
// =================================================

client.on('messageCreate',async message=>{
  if(message.author.bot) return;

  // ===== ЗАЯВКА =====
  if(message.content==='!заявка'){
    const embed=new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('Подача заявки');

    const btn=new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать заявку')
      .setStyle(ButtonStyle.Primary);

    message.channel.send({embeds:[embed],components:[new ActionRowBuilder().addComponents(btn)]});
  }


  // ===== БАЛЫ =====
  if(message.content==='!повышение'){
    const embed=new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('💎 Система балов');

    const row=new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('get').setLabel('Получить').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('balance').setLabel('Баланс').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop').setLabel('Магазин').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('give').setLabel('Выдать').setStyle(ButtonStyle.Danger)
    );

    message.channel.send({embeds:[embed],components:[row]});
  }
});



// =================================================
// ================= ИНТЕРАКЦИИ =================
// =================================================

client.on('interactionCreate',async interaction=>{

// =================================================
// =============== ЗАЯВКА =========================
// =================================================

if(interaction.isButton() && interaction.customId==='apply'){

  const modal=new ModalBuilder().setCustomId('applyModal').setTitle('Заявка');

  const add=(id,label,style)=>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(true)
    );

  modal.addComponents(
    add('nick','Ник / Имя / Возраст',TextInputStyle.Short),
    add('online','Суточный онлайн и уровень',TextInputStyle.Short),
    add('fam','В каких семьях были?',TextInputStyle.Paragraph),
    add('where','Как узнал о семье?',TextInputStyle.Short),
    add('skills','Откат тяги / спешик',TextInputStyle.Paragraph)
  );

  return interaction.showModal(modal);
}



if(interaction.isModalSubmit() && interaction.customId==='applyModal'){

  const ch=await interaction.guild.channels.fetch(APPLY_CHANNEL_ID);

  const embed=new EmbedBuilder()
    .setColor('DarkRed')
    .setTitle('📩 Новая заявка')
    .addFields(
      {name:'Пользователь',value:`${interaction.user}`},
      {name:'Ник',value:interaction.fields.getTextInputValue('nick')},
      {name:'Онлайн',value:interaction.fields.getTextInputValue('online')},
      {name:'Семьи',value:interaction.fields.getTextInputValue('fam')},
      {name:'Откуда',value:interaction.fields.getTextInputValue('where')},
      {name:'Откат',value:interaction.fields.getTextInputValue('skills')}
    );

  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`watch_${interaction.user.id}`).setLabel('👀 Смотрю').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel('📞 Обзвон').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('✅ Принять').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('❌ Отклонить').setStyle(ButtonStyle.Danger)
  );

  await ch.send({embeds:[embed],components:[row]});
  return interaction.reply({content:'Отправлено',flags:MessageFlags.Ephemeral});
}



// =================================================
// =============== БАЛАНС ==========================
// =================================================

if(interaction.isButton() && interaction.customId==='balance')
  return interaction.reply({content:`Баланс: ${getCoins(interaction.user.id)}`,flags:MessageFlags.Ephemeral});



// =================================================
// =============== ПОЛУЧИТЬ БАЛЫ ===================
// =================================================

if(interaction.isButton() && interaction.customId==='get'){
  if(isDisabled(interaction.user.id))
    return interaction.reply({content:'Ты отключен',flags:MessageFlags.Ephemeral});

  const modal=new ModalBuilder().setCustomId('proof').setTitle('Доказательства');

  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('proof').setLabel('Ссылка/скрин').setStyle(TextInputStyle.Paragraph)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('Сколько балов').setStyle(TextInputStyle.Short))
  );

  return interaction.showModal(modal);
}



if(interaction.isModalSubmit() && interaction.customId==='proof'){

  const ch=await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`approve_${interaction.user.id}_${interaction.fields.getTextInputValue('amount')}`).setLabel('Одобрить').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`disable_${interaction.user.id}`).setLabel('Отключить').setStyle(ButtonStyle.Danger)
  );

  await ch.send({content:`${interaction.user}\n${interaction.fields.getTextInputValue('proof')}`,components:[row]});
  return interaction.reply({content:'На проверке',flags:MessageFlags.Ephemeral});
}



// =================================================
// =============== ТОЛЬКО HIGHT =====================
// =================================================

if(interaction.isButton() && interaction.customId.startsWith('approve_')){
  if(!isAdmin(interaction.member))
    return interaction.reply({content:'Нет прав',flags:MessageFlags.Ephemeral});

  const[,id,a]=interaction.customId.split('_');
  addCoins(id,Number(a));
  return interaction.update({content:'Начислено',components:[]});
}



if(interaction.isButton() && interaction.customId.startsWith('disable_')){
  if(!isAdmin(interaction.member))
    return interaction.reply({content:'Нет прав',flags:MessageFlags.Ephemeral});

  const id=interaction.customId.split('_')[1];
  disableUser(id);
  return interaction.update({content:'Отключен',components:[]});
}

});



client.login(process.env.TOKEN);
