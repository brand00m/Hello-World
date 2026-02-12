import { Router } from 'express';
import { prisma } from '../index';

export const projectsRouter = Router();

// List all projects
projectsRouter.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { bomItems: true, submittals: true } },
      },
    });
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project with BOM
projectsRouter.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        bomItems: {
          include: {
            part: {
              include: {
                manufacturer: true,
                vendor: true,
                category: true,
              },
            },
          },
        },
        submittals: true,
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
projectsRouter.post('/', async (req, res) => {
  try {
    const project = await prisma.project.create({ data: req.body });
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
projectsRouter.put('/:id', async (req, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
projectsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add item to BOM
projectsRouter.post('/:id/bom', async (req, res) => {
  try {
    const bomItem = await prisma.bomItem.create({
      data: {
        projectId: req.params.id,
        ...req.body,
      },
      include: {
        part: {
          include: { manufacturer: true, vendor: true, category: true },
        },
      },
    });
    res.status(201).json(bomItem);
  } catch (error) {
    console.error('Error adding BOM item:', error);
    res.status(500).json({ error: 'Failed to add BOM item' });
  }
});

// Update BOM item
projectsRouter.put('/:id/bom/:bomItemId', async (req, res) => {
  try {
    const bomItem = await prisma.bomItem.update({
      where: { id: req.params.bomItemId },
      data: req.body,
      include: {
        part: {
          include: { manufacturer: true, vendor: true, category: true },
        },
      },
    });
    res.json(bomItem);
  } catch (error) {
    console.error('Error updating BOM item:', error);
    res.status(500).json({ error: 'Failed to update BOM item' });
  }
});

// Delete BOM item
projectsRouter.delete('/:id/bom/:bomItemId', async (req, res) => {
  try {
    await prisma.bomItem.delete({ where: { id: req.params.bomItemId } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting BOM item:', error);
    res.status(500).json({ error: 'Failed to delete BOM item' });
  }
});
