const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('ERROR: BOT_TOKEN not set in environment variables.');
  process.exit(1);
}

// Имя канала без @
const CHANNEL_USERNAME = (process.env.CHANNEL_USERNAME || 'LuminiShop').replace(/^@/, '');
const productsFile = path.join(__dirname, 'products.json');
let products = [];

// Загружаем старые товары из файла
try {
  if (fs.existsSync(productsFile)) {
    products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  }
} catch (err) {
  console.error('Failed to read products.json:', err);
  products = [];
}

const bot = new TelegramBot(token, { polling: true });

// Сохраняем товары
function saveProducts() {
  try {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save products.json:', err);
  }
}

// Когда приходит пост в канал
bot.on('channel_post', async (msg) => {
  try {
    if (!msg || !msg.chat) return;
    if (String(msg.chat.username).toLowerCase() !== String(CHANNEL_USERNAME).toLowerCase()) return;

    if (msg.photo && msg.caption) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;

      // Разбиваем caption на строки
      const lines = msg.caption.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);

      // Заголовок — первая строка
      const title = lines[0] || 'Без названия';

      // Остальные строки
      const bodyLines = lines.slice(1);

      // --- Цена ---
      let price = '0';
      let priceLine = bodyLines.find(l => /цена/i.test(l));
      if (priceLine) {
        const match = priceLine.match(/(\d+)/);
        if (match) price = match[1];
      }

      // --- Категория ---
      let category = 'all';
      let categoryLine = bodyLines.find(l => /категори/i.test(l));
      if (categoryLine) {
        category = categoryLine.split(/[:\-]/).slice(1).join(':').trim().toLowerCase();
      } else {
        let hashtagLine = bodyLines.find(l => l.startsWith('#'));
        if (hashtagLine) {
          category = hashtagLine.replace('#', '').split(/[@\s]/)[0].toLowerCase();
        }
      }

      const product = {
        id: Date.now().toString(),
        title,
        price: price || '0',
        category,
        image: `/image/${fileId}`,
        telegram_message_id: msg.message_id
      };

      products.unshift(product);
      if (products.length > 500) products = products.slice(0, 500);
      saveProducts();
      console.log('✅ Added product:', product);
    } else {
      console.log('Ignored channel_post (no photo or caption).');
    }
  } catch (err) {
    console.error('Error processing channel_post:', err);
  }
});


const app = express();

// 🔹 Включаем CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// JSON с товарами
app.get('/products.json', (req, res) => res.json(products));

// Proxy endpoint для картинок
app.get('/image/:fileId', async (req, res) => {
  const fileId = req.params.fileId;
  try {
    const file = await bot.getFile(fileId);
    if (!file || !file.file_path) return res.status(404).send('Not found');

    const tgUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    https.get(tgUrl, (tgRes) => {
      res.setHeader('Content-Type', tgRes.headers['content-type'] || 'image/jpeg');
      tgRes.pipe(res);
    }).on('error', (err) => {
      console.error('Image proxy error:', err);
      res.sendStatus(500);
    });
  } catch (err) {
    console.error('Error in /image/:fileId:', err);
    res.sendStatus(500);
  }
});

// Health-check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
