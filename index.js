const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const qrcode = require('qrcode-terminal');
const config = require('./config');

const menu = require('./menu');
const alive = require('./alive');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionId);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if(qr) {
      qrcode.generate(qr, { small: true });
      console.log('Scan the QR code with your WhatsApp');
    }

    if(connection === 'close') {
      const reason = lastDisconnect.error?.output?.statusCode;
      console.log('Disconnected, reason:', reason);

      if(reason !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...');
        startBot();
      } else {
        console.log('Logged out. Delete the session folder and re-run.');
      }
    }

    if(connection === 'open') {
      console.log('Connected!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const cmd = text.toLowerCase();

    if(config.debug) console.log(`Message from ${from}: ${text}`);

    if(cmd === config.prefix + 'ping') {
      await sock.sendMessage(from, { text: 'Pong!' });
    } else if(cmd === config.prefix + 'hello') {
      await sock.sendMessage(from, { text: 'Hello! I am your bot 🤖' });
    } else if(cmd === config.prefix + 'button') {
      const buttons = [
        { buttonId: 'btn_1', buttonText: { displayText: 'Option 1' }, type: 1 },
        { buttonId: 'btn_2', buttonText: { displayText: 'Option 2' }, type: 1 }
      ];
      const buttonMessage = {
        text: 'Choose an option:',
        buttons: buttons,
        headerType: 1
      };
      await sock.sendMessage(from, buttonMessage);
    } else if(cmd === config.prefix + 'menu') {
      await menu(sock, from);
    } else if(cmd === config.prefix + 'alive') {
      await alive(sock, from);
    }

    if(msg.message.buttonsResponseMessage) {
      const selectedButtonId = msg.message.buttonsResponseMessage.selectedButtonId;
      if(selectedButtonId === 'btn_ping') {
        await sock.sendMessage(from, { text: 'Pong from button!' });
      } else if(selectedButtonId === 'btn_menu') {
        await menu(sock, from);
      } else if(selectedButtonId === 'btn_1') {
        await sock.sendMessage(from, { text: 'You clicked Option 1' });
      } else if(selectedButtonId === 'btn_2') {
        await sock.sendMessage(from, { text: 'You clicked Option 2' });
      }
    }
  });
}

startBot();
