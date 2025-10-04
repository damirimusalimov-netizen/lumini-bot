// Минимальный Telegram-бот + Express API для выгрузки products.json
// Требует: установить переменную окружения BOT_TOKEN (токен от BotFather).
// Опционально: CHANNEL_USERNAME (без @), PORT (порт сервера).

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('ERROR: BOT_TOKEN not set in environment variables.');
  process.exit(1);
}

// Имя канала без собачки, по умолчанию "LuminiShop"
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || 'LuminiShop';

const productsFile = path.join(__dirname, 'products.json');
let products = [];

try {
  if (fs.existsSync(productsFile)) {
    products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  }
} catch (err) {
  console.error('Failed to read products.json:', err);
  products = [];
}

const bot = new TelegramBot(token, { polling: true });

function saveProducts() {
  try {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save products.json:', err);
  }
}

// Обработка новых постов в канале (channel_post)
bot.on('channel_post', async (msg) => {
  try {
    if (!msg || !msg.chat) return;
    if (String(msg.chat.username).toLowerCase() !== String(CHANNEL_USERNAME).toLowerCase()) return;

    // Берём только посты с фото и подписью
    if (msg.photo && msg.caption) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const fileUrl = await bot.getFileLink(fileId);

      const lines = msg.caption.split('\\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0] || 'Без названия';
      const priceLine = lines.find(l => /цена/i.test(l)) || '';
      const categoryLine = lines.find(l => /категори/i.test(l)) || '';
      const price = priceLine ? priceLine.split(':').slice(1).join(':').trim() : '';
      const category = categoryLine ? categoryLine.split(':').slice(1).join(':').trim() : 'all';

      const product = {
        id: Date.now().toString(),
        title,
        price: price || '0',
        category,
        image: fileUrl,
        telegram_message_id: msg.message_id
      };

      // Добавляем в начало списка (новые вверху)
      products.unshift(product);
      // Ограничим количество локально для простоты (например, 500)
      if (products.length > 500) products = products.slice(0, 500);
      saveProducts();
      console.log('✅ Added product:', product.title);
    } else {
      console.log('Ignored channel_post (no photo or caption).');
    }
  } catch (err) {
    console.error('Error processing channel_post:', err);
  }
});

// Express API для отдачи JSON
const app = express();
app.get('/products.json', (req, res) => {
  res.json(products);
});
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
