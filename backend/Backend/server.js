const { loadConfig } = require('./config');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const authRoutes = require('./src/routes/authRoutes');
const imageRoutes = require('./src/routes/imageRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const federatedAuthRoutes = require('./src/routes/federatedAuth');
const downloadRouter = require('./src/routes/download');
const cacheService = require('./src/services/cacheService');
const cors = require('cors');
const multer = require('multer');
const { verifyCognitoToken } = require('./src/middlewares/authMiddleware');
require("dotenv").config();


let io; // Declare io in the outer scope

async function startServer() {
    try {
        const config = await loadConfig();
        const app = express();
        const server = http.createServer(app);
        const corsOptions = {
            origin: (origin, callback) => {
                const allowedOrigins = [config.FRONTEND_URL, 'https://n11484209.cab432.com', 'http://localhost:3000'];
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        };
        app.use(cors(corsOptions));
        app.options('*', cors(corsOptions));
        app.set('trust proxy', 1);
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(express.static(path.join(__dirname, 'public')));

        // Multer configuration
        const storage = multer.diskStorage({
            destination: (req, file, cb) => cb(null, 'uploads/'),
            filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
        });
        const upload = multer({ storage: storage });

        // Routes
        app.use('/api/auth', authRoutes);
        app.use('/api/image', imageRoutes);
        app.use('/api/user', userRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/auth', federatedAuthRoutes);
        app.use('/api', downloadRouter);
        app.use('/api/admin', adminRoutes);

        app.use((req, res) => {
            console.log(`404 - Route not found: ${req.method} ${req.url}`);
            res.status(404).send('Route not found');
        });
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/index.html'));
        });

        io = new Server(server, {
            cors: corsOptions,
            path: '/socket.io'
        });

        io.on('connection', (socket) => {
            console.log('New client connected', socket.id);

            socket.on('register', async (userId) => {
                socket.join(userId);
                console.log(`User ${userId} registered`);

                // Fetch and send the latest progress when a user connects
                const latestProgress = await cacheService.getProgress(userId);
                if (latestProgress) {
                    socket.emit('progress', latestProgress);
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected', socket.id);
            });
        });

        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error('Error:', err.message);
            console.error('Stack:', err.stack);
            res.status(500).json({ error: 'Internal Server Error' });
        });

        // Ensure necessary directories exist
        await ensureDirectories();

        const PORT = config.PORT;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

async function ensureDirectories() {
    const dirs = [
        path.join(__dirname, 'uploads'),
        path.join(__dirname, 'uploads/enhanced'),
        path.join(__dirname, 'uploads/analysis'),
        path.join(__dirname, 'uploads/metadata')
    ];
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Export a function to get io, ensuring it's only accessed after initialization
function getIO() {
    if (!io) {
        throw new Error('Socket.IO has not been initialized. Please ensure the server has started.');
    }
    return io;
}

module.exports = { startServer, getIO };

// Start the server
startServer();