const { Telegraf } = require('telegraf');
(async () => {
  const token = process.env.TELEGRAM_INGESTION_BOT_TOKEN;
  console.log('Token present?', Boolean(token));
  const bot = new Telegraf(token);
  const me = await bot.telegram.getMe();
  console.log('Bot info:', me);
  const updates = await bot.telegram.getUpdates({ limit: 5 });
  console.log('Recent updates count:', updates.length);
})();
