import { Router } from 'express';
import { prisma } from '../index';

export const categoriesRouter = Router();

// List all categories
categoriesRouter.get('/', async (req, res) => {
  try {
    const categories = await prisma.partCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { parts: true } },
      },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
categoriesRouter.post('/', async (req, res) => {
  try {
    const category = await prisma.partCategory.create({ data: req.body });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
categoriesRouter.put('/:id', async (req, res) => {
  try {
    const category = await prisma.partCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
categoriesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.partCategory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});
