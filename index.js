require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, REST, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register Slash Command
(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            {
                body: [
                    new SlashCommandBuilder()
                        .setName('dm')
                        .setDescription('Send a DM to a user')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('The user to DM')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('The message to send')
                                .setRequired(true)
                        )
                        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                        .toJSON()
                ]
            }
        );
        console.log('✅ Slash command registered.');
    } catch (err) {
        console.error(err);
    }
})();

// Swear Word Filter Function
async function containsSwearWord(text) {
    try {
        const res = await axios.get(process.env.SWEAR_API_URL + encodeURIComponent(text));
        return res.data === true || res.data === 'true';
    } catch (err) {
        console.error('Error checking profanity:', err);
        return false;
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Check for swears
    const hasSwear = await containsSwearWord(message.content);
    if (hasSwear) {
        await message.delete().catch(() => {});
        await message.channel.send(`${message.author}, please watch your language! 🚫`);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'dm') {
        const targetUser = interaction.options.getUser('user');
        const text = interaction.options.getString('message');

        try {
            await targetUser.send(`📩 Message from ${interaction.user.username}: ${text}`);
            await interaction.reply({ content: `✅ Sent DM to ${targetUser.tag}`, ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: `❌ Could not DM ${targetUser.tag}`, ephemeral: true });
        }
    }
});

client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
