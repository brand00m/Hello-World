import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { partsRouter } from './routes/parts';
import { vendorsRouter } from './routes/vendors';
import { manufacturersRouter } from './routes/manufacturers';
import { categoriesRouter } from './routes/categories';
import { projectsRouter } from './routes/projects';
import { uploadsRouter } from './routes/uploads';
import { submittalsRouter } from './routes/submittals';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/parts', partsRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/manufacturers', manufacturersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/submittals', submittalsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
