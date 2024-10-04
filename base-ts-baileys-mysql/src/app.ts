import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MysqlAdapter as Database } from './database-mysql/index.js';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import dotenv from 'dotenv';


dotenv.config();
const PORT = process.env.PORT ?? 3008

// Flow para la información de servicios
const flowInformacion = addKeyword(EVENTS.ACTION)
    .addAnswer('✨ Me encantaría compartir algunos testimonios de nuestros clientes satisfechos: 📣', {delay:1000})
    .addAnswer('Testimonio 1', { delay:1000, media: 'https://vpkvukshcvdbdlarercb.supabase.co/storage/v1/object/public/publictogiorastreo/testimonios/Testimonio%20Cecilia%20Bermeo.ogg' })
    .addAnswer([
        '*Testimonio #1*',
        '',
        'La cliente explica que nuestro GPS está correctamente instalado. Le robaron el carro, pero pudo recuperarlo. Los ladrones sacaron otro GPS y la alarma, ¡pero no nuestro GPS! 🚗🔒'
    ])
    .addAnswer('Testimonio 2', { delay:1000, media: 'https://vpkvukshcvdbdlarercb.supabase.co/storage/v1/object/public/publictogiorastreo/testimonios/Testimonio%20Arturo%20Navarro.ogg' })
    .addAnswer([
        '*Testimonio #2*',
        '',
        '🚗 El cliente indica que sí encontró el carro, lo habían dejado abandonado. Todo esto gracias a Togio Rastreo. 🔍💪'
    ], {delay:1000})

// Flow para el soporte
const flowSoporte = addKeyword(EVENTS.ACTION)
    .addAnswer('Bienvenido al soporte de Togio Rastreo 🛠️. ¿En qué podemos ayudarte?', { media: 'https://i.imgur.com/AsvWfUX.png' });

// Flow de bienvenida con las opciones
const flowWelcome = addKeyword(['pepe'])
    .addAnswer('Hola bienvenido a *Togio Rastreo* 👋', { media: 'https://vpkvukshcvdbdlarercb.supabase.co/storage/v1/object/public/publictogiorastreo/imagen/bienvenida.jpg', delay:1000 })
    .addAnswer(
        [
            '¿En qué puedo ayudarte hoy? 🤔',
            '',
            '1️⃣ Quiero *información* y precios del servicio 📄💰',
            '2️⃣ Ya soy cliente, necesito soporte 🛠️💬',
            '',
            '*Escriba la opción:*',
        ],
        { capture: true, delay:1000 },
        async (ctx, { gotoFlow }) => {
            // Aquí esperamos la respuesta del usuario y redirigimos al flow correcto
            const userResponse = ctx.body;

            if (userResponse === '1') {
                return gotoFlow(flowInformacion);
            } else if (userResponse === '2') {
                return gotoFlow(flowSoporte);
            } else {
                return gotoFlow(flowWelcome); // Repetir el mensaje si no es una opción válida
            }
        })




const main = async () => {
    const adapterFlow = createFlow([flowWelcome, flowSoporte, flowInformacion])

    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database({
        host: process.env.MYSQL_DB_HOST,
        user: process.env.MYSQL_DB_USER,
        database: process.env.MYSQL_DB_NAME,
        password: process.env.MYSQL_DB_PASSWORD,
        port: parseInt(process.env.MYSQL_DB_PORT || '3306', 10),
    })

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
