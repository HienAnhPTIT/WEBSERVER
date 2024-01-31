const mqtt = require('mqtt');
//?//
const mongoose = require('mongoose');

// Kết nối đến MongoDB
const url = 'mongodb://localhost:27017'; // Thay đổi URL kết nối nếu cần
const dbName = 'DataNode'; // Thay đổi tên database nếu cần

mongoose.connect(`${url}/${dbName}`, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

// Kiểm tra kết nối
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Định nghĩa schema
const dataSchema = new mongoose.Schema({
    devEui: String,
    temp: Number,
    humid: Number,
    light: Number,
    dust: Number,
    rssi: Number,
    snr: Number,
    led_state: Number,
    timestamp: { type: Date, default: Date.now }
});

// Function để lấy tên collection dựa trên devEui
const getCollectionName = (devEui) => `collection_${devEui}`;

// Function để lấy model từ devEui
const getModel = (devEui) => mongoose.model(getCollectionName(devEui), dataSchema);

//?//
// Constructor Function để tạo đối tượng Device
function DeviceInfo(ApplicationID, DevEUI, AppEUI, AppKey) {
    this.ApplicationID = ApplicationID;
    this.DevEUI = DevEUI;
    this.AppEUI = AppEUI;
    this.AppKey = AppKey;

    // Tạo kết nối MQTT cho thiết bị
    this.client = mqtt.connect('mqtt://192.168.137.77');

    const uplinkTopic = `application/${this.ApplicationID}/device/${this.DevEUI}/event/up`;
    const downlinkTopic = `application/${this.ApplicationID}/device/${this.DevEUI}/command/down`;

    // Khi kết nối thành công
    this.client.on('connect', () => {
        // Subscribe vào topic uplink
        this.client.subscribe(uplinkTopic, (err) => {
            if (!err) {
                console.log(`Device ${this.DevEUI} subscribed to ${uplinkTopic}`);
            } else {
                console.error(`Error subscribing to ${uplinkTopic} for device ${this.DevEUI}: ${err}`);
            }
        });

        // Subscribe vào topic downlink
        this.client.subscribe(downlinkTopic, (err) => {
            if (!err) {
                console.log(`Device ${this.DevEUI} subscribed to ${downlinkTopic}`);
            } else {
                console.error(`Error subscribing to ${downlinkTopic} for device ${this.DevEUI}: ${err}`);
            }
        });
    });
    //?//
    // Thay đổi hàm create trong getModel để trả về Promise
    const createDocument = async (devEui, document) => {
        const DataModel = getModel(devEui);
        return DataModel.create(document);
    };
    //?//

    this.client.on('message', async (topic, message) => {
        const uplinkTopic = `application/${this.ApplicationID}/device/${this.DevEUI}/event/`;
        const downlinkTopic = `application/${this.ApplicationID}/device/${this.DevEUI}/command/down`;

        if (topic.startsWith(uplinkTopic)) {
            console.log(`Device ${this.DevEUI} send uplink message on topic ${topic}: \n ${message.toString()} \n`);
            //?//
            // Parse JSON message
            const data = JSON.parse(message.toString());

            // Extract required information
            const devEui = data.deviceInfo.devEui;

            // Create a document to insert into the database
            const document = {
                devEui,
                temp: data.object.Temp,
                humid: data.object.Humid,
                light: data.object.Light,
                dust: data.object.Dust,
                rssi: data.rxInfo[0].rssi,
                snr: data.rxInfo[0].snr,
                led_state: data.object.Led_state,
            };

            // Lấy tên collection và model tương ứng với devEui
            const collectionName = getCollectionName(devEui);

            // Insert the document into the dynamic collection using Promise
            try {
                const result = await createDocument(devEui, document);
                console.log(`Inserted document with _id: ${result._id} into collection ${collectionName}`);
            } catch (err) {
                console.error(`Error inserting document into collection ${collectionName}:`, err);
            }
            //?//
        } else if (topic.startsWith(downlinkTopic)) {
            console.log(`Device ${this.DevEUI} received downlink message on topic ${topic}: \n ${message.toString()} \n`);
            console.log("---------------------------");
        }
    });

    this.client.on('close', () => {
        console.log(`Connection for device ${this.DevEUI} closed.`);
    });

    this.client.on('error', (err) => {
        console.error(`Error for device ${this.DevEUI}:`, err);
    });

    // Phương thức để gửi bản tin downlink
    this.sendDownlinkCommand = (dataJson) => {
        const downlinkTopic = `application/${this.ApplicationID}/device/${this.DevEUI}/command/down`;
        //?//
        // Chuyển chuỗi JSON thành đối tượng JavaScript
        const parsedData = JSON.parse(dataJson);
        //?//
        // const dataMessage = JSON.stringify(dataJson, null, 2);
        const dataMessage = JSON.stringify(parsedData, null, 2);
        console.log(dataMessage),
            this.client.publish(downlinkTopic, dataMessage);
    };

    this.onledjson = {
        "devEui": `${this.DevEUI}`,
        "confirmed": false,
        "fPort": 30,
        "data": "+A=="
    };

    this.offledjson = {
        "devEui": `${this.DevEUI}`,
        "confirmed": false,
        "fPort": 20,
        "data": "9w=="
    };
}

// Tạo các đối tượng DeviceInfo mới
const device1 = new DeviceInfo('4fbd545a-715a-4607-b6d9-69d1c3e6f503', '77f787d7bb03ed30', '0000000000000000', 'c2573c24bc63a62d01f52a4f6e165226');
const device2 = new DeviceInfo('4fbd545a-715a-4607-b6d9-69d1c3e6f503', 'b6bd2fbb7d7400bd', '0000000000000000', 'f111a1f79392907f8423e25146a434e7');

// Thêm các thiết bị khác nếu cần
const onled1 = JSON.stringify(device1.onledjson);
const offled1 = JSON.stringify(device1.offledjson);

const onled2 = JSON.stringify(device2.onledjson);
const offled2 = JSON.stringify(device2.offledjson);

//?//
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const ejs = require('ejs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('home');
});
app.get('/history', (req, res) => {
    let node = req.query.node;
    res.render('history', {
        node: node
      });
});

let selectedNode = 0;

io.on('connection', (socket) => {
    console.log('A user connected: ' + selectedNode);

    socket.on('buttonClickON1', () => {
        console.log('Button clicked');
        // Thực hiện các hành động bạn muốn khi nút được nhấp ở đây
        device1.sendDownlinkCommand(onled1);        
    });

    socket.on('buttonClickON2', () => {
        console.log('Button clicked');
        // Thực hiện các hành động bạn muốn khi nút được nhấp ở đây
        device2.sendDownlinkCommand(onled2);        
    });

    socket.on('buttonClickOFF1', () => {
        console.log('Button clicked');
        // Thực hiện các hành động bạn muốn khi nút được nhấp ở đây
        device1.sendDownlinkCommand(offled1);
    });
    socket.on('buttonClickOFF2', () => {
        console.log('Button clicked');
        // Thực hiện các hành động bạn muốn khi nút được nhấp ở đây
        device2.sendDownlinkCommand(offled2);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/onoffLed', async (req, res) => {
    try {
        let number = req.query.node;
        let status = req.query.status;

        let devEui = '';
        if(number == 1) {
            if(status == 1) {
                device1.sendDownlinkCommand(onled);
            } else {
                device1.sendDownlinkCommand(offled);
            }
        } else {
            if(status == 1) {
                device2.sendDownlinkCommand(onled);
            } else {
                device2.sendDownlinkCommand(offled);
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/getData', async (req, res) => {
    
    try {
        let number = req.query.node;
        let data = {'aabc' : number};

        selectedNode = number;

        let devEui = '';
        if(number == 1) {
            devEui = '77f787d7bb03ed30';
        } else {
            devEui = 'b6bd2fbb7d7400bd';
        }

        //doc vao db de lay du lieu theo node
        // Tạo mô hình dữ liệu từ schema
        const DataModel = getModel(devEui);

        // Đọc dữ liệu từ MongoDB
        DataModel.find().sort({timestamp: -1}).limit(1).then((data) => {
            console.log(data);
            // Send the data back to the client
            res.send(JSON.stringify(data));
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/getFullData', async (req, res) => {

    try {
        let number = req.query.node;
        let data = {'aabc' : number};

        let devEui = '';
        if(number == 1) {
            devEui = '77f787d7bb03ed30';
        } else {
            devEui = 'b6bd2fbb7d7400bd';
        }

        //doc vao db de lay du lieu theo node
        // Tạo mô hình dữ liệu từ schema
        const DataModel = getModel(devEui);

        // Đọc dữ liệu từ MongoDB
        DataModel.find().sort({timestamp: -1}).limit(100).then((data) => {
            console.log(data);
            // Send the data back to the client
            res.send(JSON.stringify(data));
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

