const { Client, Intents } = require('discord.js')
const { MongoClient } = require('mongodb')
const dotenv = require('dotenv')

dotenv.config()


const dcClient = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })

dcClient.once('ready', () => {
    console.log('bot is online!')
    monitorChanges()
})


const mongoClient = new MongoClient(process.env.MONGO_URI)
monitorChanges()

async function monitorChanges(){
    try{
        await mongoClient.connect()
        console.log('client connected!')
        const tickets = mongoClient.db('business-os').collection('tickets')
        const changeStream = await tickets.watch()

        console.log('listening for changes')
        changeStream.on('change', (change) => {
            console.log('Change detected: ', change)
           
        })
    } 
    catch(error) {
        console.log(error)
    } 
}

