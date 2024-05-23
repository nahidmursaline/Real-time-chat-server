const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ltkvgnf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let chatRoomsCollection;
let messagesCollection;

async function run() {
  try {
    await client.connect();
    chatRoomsCollection = client.db("chatApp").collection("chatRooms");
    messagesCollection = client.db("chatApp").collection("messages");
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error: ", err);
  }
}
run().catch(console.dir);

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
  });

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('sendMessage', async (data) => {
    const { roomId, message, user } = data;
    const newMessage = { roomId, message, user, timestamp: new Date() };
    try {
      const result = await messagesCollection.insertOne(newMessage);
      newMessage._id = result.insertedId;  
      io.to(roomId).emit('newMessage', newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

app.post('/rooms', async (req, res) => {
  const { name, description } = req.body;
  const newRoom = { name, description, createdAt: new Date() };
  try {
    const result = await chatRoomsCollection.insertOne(newRoom);
    newRoom._id = result.insertedId; // Add the inserted ID to the room object
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).send('Error creating chat room');
  }
});

app.get('/rooms', async (req, res) => {
  try {
    const rooms = await chatRoomsCollection.find().toArray();
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).send('Error fetching chat rooms');
  }
});

app.get('/rooms/:id/messages', async (req, res) => {
  const { id } = req.params;
  try {
    const messages = await messagesCollection.find({ roomId: id }).toArray();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).send('Error fetching messages');
  }
});

app.post('/rooms/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { message, user } = req.body;
  const newMessage = { roomId: id, message, user, timestamp: new Date() };
  try {
    const result = await messagesCollection.insertOne(newMessage);
    newMessage._id = result.insertedId;  
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Error sending message');
  }
});

app.get('/', (req, res) => {
  res.send('Real Time Chat is Running');
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});









