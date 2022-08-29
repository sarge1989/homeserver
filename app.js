import express from 'express';
import https from "https";
import dotenv from "dotenv";
import * as mqtt from "mqtt" // import everything inside the mqtt module and give it the namespace "mqtt"

dotenv.config();

//set up MQTT client
let client = mqtt.connect('mqtt://localhost') // create a client

//inform on connect
client.on("connect", () => console.log("connected"));

//Handle MQTT connection errors
client.on("error", (error) => {
    console.log("Can't connect" + error);
    process.exit(1);
})

//set up Express Server
const app = express();
const port = int(process.env.PORT_NUM);
const chat_id = int(process.env.CHAT_ID)
const keyboardOptions = {
    keyboard: [
        [{ text: "Toggle Room Light" }, { text: "Off Room Light" }],
        [{ text: "Toggle Heater" }, { text: "Off Heater" }],
        [{ text: "Off Everything" }],
    ]
}

app.use(express.json());

app.post('/telegram-bot-handler', (req, res) => {
    const message = req.body.message;
    if (message.from.id != chat_id) {
        res.status(401).send('Not authorised!');
    }
    else {
        let prefix = "Done! "
        switch (message.text.toLowerCase()) {
            case "/start":
                prefix = ""
                break;
            case "toggle room light":
                client.publish('zigbee2mqtt/devices/switches/room_0/set', '{"state": "TOGGLE"}');
                break;
            case "off room light":
                client.publish('zigbee2mqtt/devices/switches/room_0/set', '{"state": "OFF"}');
                break;
            case "off everything":
                client.publish('zigbee2mqtt/devices/switches/room_0/set', '{"state": "OFF"}');
                client.publish('zigbee2mqtt/devices/plugs/fan_chair/set', '{"state": "OFF"}');
                client.publish('zigbee2mqtt/devices/plugs/fan_bed/set', '{"state": "OFF"}');
                client.publish('zigbee2mqtt/devices/switches/toilet_0/set', '{"state_left": "OFF"}')
                client.publish('zigbee2mqtt/devices/switches/toilet_0/set', '{"state_right": "OFF"}')
        }
        sendTelegramMessage(`${prefix}Select any of these options`, keyboardOptions);
        res.status(200).send('Status: OK')
    }
})

//helper function to send telegram messages

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

function sendTelegramMessage(messageText, keyboardOptions) {
    const data = JSON.stringify({
        chat_id: chat_id,
        text: messageText,
        reply_markup: keyboardOptions
    })
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${process.env.BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        },
    };
    const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);
        res.on('data', d => {
            process.stdout.write(d);
        });
    });
    req.write(data);
    req.end();
}