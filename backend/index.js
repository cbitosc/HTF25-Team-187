import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { createPost, summarizePost } from './routes/posts.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.post('/posts', createPost);
app.get('/posts/:id/summarize', summarizePost);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
