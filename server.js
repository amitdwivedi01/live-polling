const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file
const host = 'https://live-polling-2023.netlify.app';
// const host = 'http://localhost:5173';

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: `${host}`,
    methods: ['GET', 'POST'],
  },
});

// Use cors middleware for Express
app.use(cors());

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create a MongoDB schema for votes
const voteSchema = new mongoose.Schema({
  questionId: Number,
  selectedOption: String,
});

// Create a MongoDB model based on the schema
const Vote = mongoose.model('Vote', voteSchema);

// Sample poll questions
const pollQuestions = [
  {
    id: 1,
    question: "What's your preferred weekend activity ?",
    options: [' Netflix binge', 'Outdoor adventure', 'Reading a book'],
  },
  {
    id: 2,
    question: 'When it comes to pets, are you Team',
    options: ['Dog', 'cat','others'],
  },
  {
    id: 3,
    question: "What's your ideal vacation destination?",
    options: ['Beach resort', 'Mountain retreat','City exploration'],
  },
  {
    id: 4,
    question: 'In a karaoke battle, would you choose to sing',
    options: ['Rock', 'Pop','Classic ballads'],
  },
  {
    id: 5,
    question: 'For a movie night, do you prefer watching',
    options: ['Comedy', 'Action','Romantic movies'],
  },
  {
    id: 6,
    question: 'When faced with a challenge, are you more likely to approach it',
    options: ['Strategically', 'Emotionally','Creatively'],
  },
  {
    id: 7,
    question: "What's your favorite season?",
    options: ['Spring', 'Summer','Winter'],
  },
  {
    id: 8,
    question: "In a dessert showdown, would you go for",
    options: ['Chocolate cake', 'Fruit tart','Ice cream'],
  },
  {
    id: 9,
    question: "How do you take your coffee?",
    options: ['Black', 'With cream','Mocha with all the toppings.'],
  },

];

// In-memory store for voting data
let votingData = {};

// Endpoint to get poll questions
app.get('/poll', (req, res) => {
  res.header('Access-Control-Allow-Origin', `${host}`);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.json(pollQuestions);
});

// Endpoint to get the current leaderboard data
app.get('/leaderboard', async (req, res) => {
  res.header('Access-Control-Allow-Origin', `${host}`);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    // Fetch voting data from MongoDB
    const votes = await Vote.find({});
    votingData = calculateLeaderboard(votes);

    res.json(votingData);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Handle Socket.IO events
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle poll response submission
  socket.on('submitResponse', async (response) => {
    console.log(`Received response: ${JSON.stringify(response)}`);

    // Save the vote to MongoDB
    try {
      const vote = new Vote(response);
      await vote.save();

      // Fetch voting data from MongoDB
      const votes = await Vote.find({});
      votingData = calculateLeaderboard(votes);

      // Emit an event to update the leaderboard
      io.emit('updateLeaderboard', votingData);
    } catch (error) {
      console.error('Error saving vote:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Calculate leaderboard from votes
function calculateLeaderboard(votes) {
  const result = {};

  votes.forEach((vote) => {
    const { questionId, selectedOption } = vote;
    if (!result[questionId]) {
      result[questionId] = {};
    }
    result[questionId][selectedOption] = (result[questionId][selectedOption] || 0) + 1;
  });

  return result;
}

// Other server code...

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
