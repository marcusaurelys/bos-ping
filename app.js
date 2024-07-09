const { Client, GatewayIntentBits } = require('discord.js')
const { MongoClient, ObjectId } = require('mongodb')
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
            sendMessage(change, tickets)
           
        })
    } 
    catch(error) {
        console.log(error)
    } 
}

async function sendMessage(change, tickets){

    const update = await tickets.findOne({_id : change.documentKey._id})

    let message = ''
    if(change.operationType === 'update'){
        if(change.updateDescription.updatedFields.status){
            message = 
`@everyone, ticket ${change.documentKey._id.toString()} has been set to **${change.updateDescription.updatedFields.status}**. 
                    
**Title**: ${update.name}

**Description**: ${update.description}\n
                    
View more of the ticket details here: http://localhost:3000/ticket/${change.documentKey._id.toString()}`
        
        }
        else if(change.updateDescription.updatedFields.userIDs && change.updateDescription.updatedFields.userIDs.length > 0){
           
           const userIDs =  change.updateDescription.updatedFields.userIDs.map(id => new ObjectId(id))
           const discordUsernames = await mongoClient.db('business-os').collection('users').find(
            {_id: {$in: userIDs}}, 
            {projection: {discord: 1}}
            ).toArray()
            const mention = discordUsernames.map((username) => `<@${username.discord}>`)
            console.log(discordUsernames)
            console.log(mention)
            message = 
`${mention.join(', ') } you have been assigned to ticket ${change.documentKey._id.toString()}.

**Title**: ${update.name}

**Description**: ${update.description}


View more of the ticket details here: http://localhost:3000/ticket/${change.documentKey._id.toString()}
`
           
        }
    }

    if(change.operationType === 'create'){
        message = 
`@everyone a new ticket has been added.

**Title**: ${update.name}

**Description**: ${update.description}\n
        
View more of the ticket details here: http://localhost:3000/ticket/${change.documentKey._id.toString()}`
    }

    if(message != ''){
        const channel = await dcClient.channels.fetch(process.env.CHANNEL_ID)
        console.log(channel)
        channel.send(message)
    }
}


async function cleanup(){
    await mongoClient.close()
    console.log('client disconnected!')
    dcClient.destroy()
}

process.on('SIGTERM',cleanup);  //general termination signal
process.on('SIGINT',cleanup);   //catches when ctrl + c is used
process.on('SIGQUIT', cleanup); //catches other termination commands