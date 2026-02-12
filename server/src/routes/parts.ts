import { Router } from 'express';
import { prisma } from '../index';

export const partsRouter = Router();

// List parts with search, filter, and pagination
partsRouter.get('/', async (req, res) => {
  try {
    const {
      search,
      categoryId,
      vendorId,
      manufacturerId,
      page = '1',
      limit = '50',
      sortBy = 'description',
      sortDir = 'asc',
    } = req.query;

    const where: any = {};

    if (search) {
      const term = String(search);
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { model: { contains: term, mode: 'insensitive' } },
        { submittalName: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = String(categoryId);
    if (vendorId) where.vendorId = String(vendorId);
    if (manufacturerId) where.manufacturerId = String(manufacturerId);

    const pageNum = Math.max(1, parseInt(String(page)));
    const pageSize = Math.min(200, Math.max(1, parseInt(String(limit))));

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        include: {
          manufacturer: true,
          vendor: true,
          category: true,
        },
        orderBy: { [String(sortBy)]: String(sortDir) },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.part.count({ where }),
    ]);

    res.json({
      data: parts,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// Get single part
partsRouter.get('/:id', async (req, res) => {
  try {
    const part = await prisma.part.findUnique({
      where: { id: req.params.id },
      include: {
        manufacturer: true,
        vendor: true,
        category: true,
        documents: true,
      },
    });
    if (!part) return res.status(404).json({ error: 'Part not found' });
    res.json(part);
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: 'Failed to fetch part' });
  }
});

// Create part
partsRouter.post('/', async (req, res) => {
  try {
    const part = await prisma.part.create({
      data: req.body,
      include: {
        manufacturer: true,
        vendor: true,
        category: true,
      },
    });
    res.status(201).json(part);
  } catch (error) {
    console.error('Error creating part:', error);
    res.status(500).json({ error: 'Failed to create part' });
  }
});

// Update part
partsRouter.put('/:id', async (req, res) => {
  try {
    const part = await prisma.part.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        manufacturer: true,
        vendor: true,
        category: true,
      },
    });
    res.json(part);
  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({ error: 'Failed to update part' });
  }
});

// Delete part
partsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.part.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({ error: 'Failed to delete part' });
  }
});
