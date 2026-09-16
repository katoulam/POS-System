import { Router } from "express";
import { prisma } from "../../db/prisma";

export const menuRouter = Router();

// Categories — this is the "add a category with a button" endpoint the
// AdminConfig screen calls. No code changes needed to add new ones.
menuRouter.get("/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  res.json(categories);
});

menuRouter.post("/categories", async (req, res) => {
  const { name, sortOrder } = req.body;
  const category = await prisma.category.create({
    data: { name, sortOrder: sortOrder ?? 0 },
  });
  res.status(201).json(category);
});

menuRouter.patch("/categories/:id", async (req, res) => {
  const { name, sortOrder, isActive } = req.body;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, sortOrder, isActive },
  });
  res.json(category);
});

// Menu items — includes modifier groups and default (pre-highlighted)
// modifiers, so a client can render a specialty item with the right
// toppings already selected.
menuRouter.get("/categories/:categoryId/items", async (req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { categoryId: req.params.categoryId },
    orderBy: { sortOrder: "asc" },
    include: {
      modifierGroups: { include: { modifierGroup: { include: { modifiers: true } } } },
      defaultModifiers: true,
    },
  });
  res.json(items);
});

menuRouter.post("/items", async (req, res) => {
  const { categoryId, name, description, basePrice, isBuildYourOwn, sortOrder } = req.body;
  const item = await prisma.menuItem.create({
    data: { categoryId, name, description, basePrice, isBuildYourOwn: !!isBuildYourOwn, sortOrder: sortOrder ?? 0 },
  });
  res.status(201).json(item);
});

// Attach a modifier group to a menu item (e.g. "Size" onto "Pizza").
menuRouter.post("/items/:itemId/modifier-groups/:groupId", async (req, res) => {
  const link = await prisma.menuItemModifierGroup.create({
    data: { menuItemId: req.params.itemId, modifierGroupId: req.params.groupId },
  });
  res.status(201).json(link);
});

// Mark a modifier as pre-highlighted/default for a specialty item
// (e.g. pepperoni on "Meat Lovers Pizza").
menuRouter.post("/items/:itemId/default-modifiers/:modifierId", async (req, res) => {
  const link = await prisma.menuItemDefaultModifier.create({
    data: { menuItemId: req.params.itemId, modifierId: req.params.modifierId },
  });
  res.status(201).json(link);
});

menuRouter.delete("/items/:itemId/default-modifiers/:modifierId", async (req, res) => {
  await prisma.menuItemDefaultModifier.delete({
    where: {
      menuItemId_modifierId: {
        menuItemId: req.params.itemId,
        modifierId: req.params.modifierId,
      },
    },
  });
  res.status(204).send();
});

menuRouter.get("/modifier-groups", async (_req, res) => {
  const groups = await prisma.modifierGroup.findMany({ include: { modifiers: true } });
  res.json(groups);
});

menuRouter.post("/modifier-groups", async (req, res) => {
  const { name, selectionType, isRequired } = req.body;
  const group = await prisma.modifierGroup.create({
    data: { name, selectionType, isRequired: !!isRequired },
  });
  res.status(201).json(group);
});

menuRouter.post("/modifier-groups/:groupId/modifiers", async (req, res) => {
  const { name, priceDelta } = req.body;
  const modifier = await prisma.modifier.create({
    data: { modifierGroupId: req.params.groupId, name, priceDelta: priceDelta ?? 0 },
  });
  res.status(201).json(modifier);
});
