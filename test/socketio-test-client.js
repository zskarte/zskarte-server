const process = require('process');
const { io } = require('socket.io-client');

const SERVER_URL = 'http://0.0.0.0:1337';
const JWT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjYwODA1NDU1LCJleHAiOjE2NjMzOTc0NTV9.F9L-zcSY8252FiNcthmQAWgvBbC-ZsSPOd1GwFCST-I';

const socket = io(SERVER_URL, {
  auth: {
    token: JWT_TOKEN,
  },
  transports: ['websocket'],
  query: "operationId=1&identifier=12345",
});

socket.on('connect', () => {
  console.log('connected')
});

process.stdin.resume();