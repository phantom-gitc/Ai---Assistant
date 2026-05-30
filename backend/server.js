import app from './src/app.js';
import connectDB from './src/db/db.js';
import initSocketServer from './src/sockets/socket.server.js';
import config from './src/config/config.js';
import http from 'http';

const httpServer = http.createServer(app);

connectDB();
initSocketServer(httpServer);

httpServer.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
})
