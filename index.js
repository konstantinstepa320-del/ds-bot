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


// ===== ТВОИ ID =====
const LOG_CHANNEL = "1469477344161959957"; // проверки
const STATS_CHANNEL = "1469478344772026409"; // мои баллы

const IMAGE =
"https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png";


// ===== БАЛЛЫ =====
const DB = "./points.json";
let db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : {};

const add = (id,n)=>{ if(!db[id])db[id]=0; db[id]+=n; fs.writeFileSync(DB,JSON.stringify(db)); }
const get = id => db[id] || 0;


// ===== БОТ =====
const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready',()=>console.log('✅ Бот запущен'));


// =================================================
//                    КОМАНДЫ
// =================================================

client.on('messageCreate', async msg=>{
  if(msg.author.bot) return;


  // ===== ПАНЕЛЬ ЗАЯВКИ =====
  if(msg.content==='!заявка'){

    const embed=new EmbedBuilder()
      .setImage(IMAGE)
      .setTitle('📩 Подать заявку');

    const btn=new ButtonBuilder()
      .setCustomId('apply')
      .setLabel('Подать')
      .setStyle(ButtonStyle.Primary);

    msg.channel.send({
      embeds:[embed],
      components:[new ActionRowBuilder().addComponents(btn)]
    });
  }


  // ===== ПАНЕЛЬ ПОВЫШЕНИЯ =====
  if(msg.content==='!повышение'){

    const embed=new EmbedBuilder()
      .setImage(IMAGE)
      .setTitle('📈 Система повышения')
      .setDescription('Нажми нужную кнопку');

    const row=new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('p_2').setLabel('🔐 Тайник +2').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p_3').setLabel('📦 Дроп +3').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p_4').setLabel('⚔️ Капт +4').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p_1').setLabel('🥇 Топ1 +1').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('p_-50').setLabel('❌ Варн -50').setStyle(ButtonStyle.Danger)
    );

    msg.channel.send({embeds:[embed],components:[row]});
  }


  // ===== ПАНЕЛЬ БАЛЛОВ =====
  if(msg.content==='!баллыпанель'){

    const embed=new EmbedBuilder()
      .setImage(IMAGE)
      .setTitle('📊 Мои баллы');

    const btn=new ButtonBuilder()
      .setCustomId('my_points')
      .setLabel('Сколько у меня баллов')
      .setStyle(ButtonStyle.Success);

    msg.channel.send({embeds:[embed],components:[new ActionRowBuilder().addComponents(btn)]});
  }

});


// =================================================
//                ИНТЕРАКЦИИ
// =================================================

client.on('interactionCreate', async i=>{


// ================= ЗАЯВКА =================

if(i.isButton() && i.customId==='apply'){

  const modal=new ModalBuilder()
    .setCustomId('apply_form')
    .setTitle('Заявка');

  const input=(id,label,style)=>new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(true)
  );

  modal.addComponents(
    input('nick','Ник / возраст',TextInputStyle.Short),
    input('online','Онлайн',TextInputStyle.Short),
    input('fam','Семьи',TextInputStyle.Paragraph)
  );

  return i.showModal(modal);
}


if(i.isModalSubmit() && i.customId==='apply_form'){

  const ch=i.guild.channels.cache.get(LOG_CHANNEL);

  const embed=new EmbedBuilder()
    .setTitle('📨 Новая заявка')
    .setDescription(`${i.user}`);

  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`watch_${i.user.id}`).setLabel('👀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`call_${i.user.id}`).setLabel('📞').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`accept_${i.user.id}`).setLabel('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reject_${i.user.id}`).setLabel('❌').setStyle(ButtonStyle.Danger)
  );

  ch.send({embeds:[embed],components:[row]});
  return i.reply({content:'Отправлено',flags:MessageFlags.Ephemeral});
}


// ❌ причина отказа
if(i.isButton() && i.customId.startsWith('reject_')){

  const id=i.customId.split('_')[1];

  const modal=new ModalBuilder()
    .setCustomId(`reject_reason_${id}`)
    .setTitle('Причина отказа');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Причина')
        .setStyle(TextInputStyle.Paragraph)
    )
  );

  return i.showModal(modal);
}


if(i.isModalSubmit() && i.customId.startsWith('reject_reason_')){

  const id=i.customId.split('_')[2];
  const member=await i.guild.members.fetch(id);

  member.send(`❌ Заявка отклонена\nПричина: ${i.fields.getTextInputValue('reason')}`);

  return i.reply({content:'Отклонено',flags:MessageFlags.Ephemeral});
}



// ================= БАЛЛЫ =================

// выбор кнопки
if(i.isButton() && i.customId.startsWith('p_')){

  const value=i.customId.split('_')[1];

  const modal=new ModalBuilder()
    .setCustomId(`proof_${value}`)
    .setTitle('Скрин');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('link')
        .setLabel('Ссылка на скрин')
        .setStyle(TextInputStyle.Short)
    )
  );

  return i.showModal(modal);
}


// отправка скрина
if(i.isModalSubmit() && i.customId.startsWith('proof_')){

  const value=i.customId.split('_')[1];

  const ch=i.guild.channels.cache.get(LOG_CHANNEL);

  const btn=new ButtonBuilder()
    .setCustomId(`confirm_${i.user.id}_${value}`)
    .setLabel('✅ Подтвердить')
    .setStyle(ButtonStyle.Success);

  ch.send({
    content:`${i.user} | ${value} баллов\n${i.fields.getTextInputValue('link')}`,
    components:[new ActionRowBuilder().addComponents(btn)]
  });

  return i.reply({content:'Отправлено на проверку',flags:MessageFlags.Ephemeral});
}


// подтверждение
if(i.isButton() && i.customId.startsWith('confirm_')){

  const [ , id, val ] = i.customId.split('_');

  add(id,Number(val));

  const total=get(id);

  const member=await i.guild.members.fetch(id);
  member.send(`✅ Начислено ${val}\nВсего: ${total}`);

  return i.update({content:'Начислено',components:[]});
}


// мои баллы
if(i.isButton() && i.customId==='my_points'){
  return i.reply({content:`У тебя ${get(i.user.id)} баллов`,flags:MessageFlags.Ephemeral});
}


});


client.login(process.env.BOT_TOKEN);
