require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// Simple web server for Render/UptimeRobot
app.get('/', (req, res) => res.send('Bot is alive.'));
app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// Swear word API check function (using native fetch)
async function containsSwearWord(text) {
    try {
        const res = await fetch(`https://www.purgomalum.com/service/json?text=${encodeURIComponent(text)}`);
        const data = await res.json();
        return data.result !== text;
    } catch (err) {
        console.error('Swear filter API error:', err);
        return false; // Fail safe
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: ['CHANNEL']
});

// Slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('dm')
        .setDescription('DM a user with a message')
        .addUserOption(option =>
            option.setName('user').setDescription('User to DM').setRequired(true))
        .addStringOption(option =>
            option.setName('message').setDescription('Message to send').setRequired(true))
].map(cmd => cmd.toJSON());

// Register commands on startup
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Slash command registered.');
    } catch (err) {
        console.error('Error registering commands:', err);
    }
})();

// Bot ready event
client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

// Handle commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'dm') {
        try {
            await interaction.deferReply({ flags: 64 }).catch(() => {});

            const targetUser = interaction.options.getUser('user');
            const text = interaction.options.getString('message');

            if (await containsSwearWord(text)) {
                return interaction.editReply('❌ Your DM contains inappropriate language. It was not sent.').catch(() => {});
            }

            try {
                await targetUser.send(`📩 Message from ${interaction.user.username}: ${text}`);
                await interaction.editReply(`✅ Sent DM to ${targetUser.tag}`).catch(() => {});
            } catch {
                await interaction.editReply(`❌ Could not DM ${targetUser.tag}`).catch(() => {});
            }
        } catch (err) {
            if (err.code !== 10062) {
                console.error('DM command error:', err);
            }
        }
    }
});

client.login(process.env.TOKEN);

