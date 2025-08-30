const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@adiwajshing/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const config = require("./config.json");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    version
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log("Scan QR code with your WhatsApp.");
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("Logged out. Delete session folder and scan QR again.");
      } else {
        console.log("Reconnecting...");
        startBot();
      }
    }

    if (connection === 'open') {
      console.log(`Connected as ${config.ownerName}'s bot.`);
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;

    console.log(`Message from ${sender}: ${messageText}`);

    // Auto reply example
    if (messageText.toLowerCase().includes('hi') || messageText.toLowerCase().includes('hello')) {
      await sock.sendMessage(sender, { text: config.autoReplyMessage });
    }

    // Commands with prefix
    if (messageText.startsWith(config.prefix)) {
      const command = messageText.slice(config.prefix.length).trim().toLowerCase();

      if (command === 'ping') {
        await sock.sendMessage(sender, { text: 'Pong! PASIYA-MD Bot is online.' });
      }

      if (command === 'help') {
        await sock.sendMessage(sender, { text: `Hello! This is ${config.ownerName}'s Bot.\nCommands:\n!ping\n!help` });
      }
    }
  });
}

startBot();
