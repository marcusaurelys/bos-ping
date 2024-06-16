const { Client, GatewayIntentBits } = require('discord.js')
const { MongoClient } = require('mongodb')
const dotenv = require('dotenv')

dotenv.config()

const dcClient = new Client({intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageTyping]})
dcClient.login(process.env.DC_BOT_TOKEN)

dcClient.once('ready', () => {
    console.log('bot is online!')
    monitorChanges()
})


const mongoClient = new MongoClient(process.env.MONGO_URI)

async function monitorChanges(){
    try{
        await mongoClient.connect()
        console.log('client connected!')
        const tickets = mongoClient.db('business-os').collection('tickets')
        const changeStream = await tickets.watch()

        console.log('listening for changes')
        changeStream.on('change', (change) => {
            console.log('Change detected: ', change)
            sendMessage('may nagbago pacheck')
           
        })
    } 
    catch(error) {
        console.log(error)
    } 
}

async function sendMessage(change){
    const channel = await dcClient.channels.fetch(process.env.CHANNEL_ID)
    console.log(channel)
    channel.send('may nagbago pacheck')
}


async function cleanup(){
    await mongoClient.close()
    console.log('client disconnected!')
}

process.on('SIGTERM',cleanup);  //general termination signal
process.on('SIGINT',cleanup);   //catches when ctrl + c is used
process.on('SIGQUIT', cleanup); //catches other termination commands