import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../index';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

export const uploadsRouter = Router();

// Upload a document for a part
uploadsRouter.post('/parts/:partId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { docType = 'cut_sheet' } = req.body;
    const validTypes = ['cut_sheet', 'iom', 'pics'];
    if (!validTypes.includes(docType)) {
      return res.status(400).json({ error: `Invalid docType. Must be one of: ${validTypes.join(', ')}` });
    }

    const doc = await prisma.partDocument.create({
      data: {
        partId: req.params.partId,
        docType,
        fileName: req.file.originalname,
        filePath: req.file.filename,
        fileSize: req.file.size,
      },
    });

    res.status(201).json(doc);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// List documents for a part
uploadsRouter.get('/parts/:partId', async (req, res) => {
  try {
    const docs = await prisma.partDocument.findMany({
      where: { partId: req.params.partId },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(docs);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Delete a document
uploadsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.partDocument.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});
