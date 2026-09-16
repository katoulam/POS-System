import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.employee.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Owner",
      pinHash: "0000",
      role: "owner",
    },
  });

  await prisma.payRate.create({
    data: { employeeId: owner.id, hourlyRate: 25, effectiveFrom: new Date("2020-01-01") },
  });

  for (let i = 1; i <= 10; i++) {
    await prisma.restaurantTable.upsert({
      where: { tableNumber: i },
      update: {},
      create: { tableNumber: i, posX: (i % 5) * 100, posY: Math.floor(i / 5) * 100 },
    });
  }

  const pizzaCategory = await prisma.category.create({
    data: { name: "Pizza", sortOrder: 1 },
  });

  const size = await prisma.modifierGroup.create({
    data: { name: "Size", selectionType: "single", isRequired: true },
  });
  await prisma.modifier.createMany({
    data: [
      { modifierGroupId: size.id, name: "Small", priceDelta: 0 },
      { modifierGroupId: size.id, name: "Medium", priceDelta: 2 },
      { modifierGroupId: size.id, name: "Large", priceDelta: 4 },
    ],
  });

  const shape = await prisma.modifierGroup.create({
    data: { name: "Shape", selectionType: "single", isRequired: true },
  });
  await prisma.modifier.createMany({
    data: [
      { modifierGroupId: shape.id, name: "Round", priceDelta: 0 },
      { modifierGroupId: shape.id, name: "Square", priceDelta: 0 },
    ],
  });

  const toppings = await prisma.modifierGroup.create({
    data: { name: "Toppings", selectionType: "multiple", isRequired: false },
  });
  const [pepperoni, sausage, mushroom, onion] = await Promise.all(
    ["Pepperoni", "Sausage", "Mushroom", "Onion"].map((name) =>
      prisma.modifier.create({ data: { modifierGroupId: toppings.id, name, priceDelta: 1 } })
    )
  );

  const meatLovers = await prisma.menuItem.create({
    data: {
      categoryId: pizzaCategory.id,
      name: "Meat Lovers Pizza",
      basePrice: 12,
      isBuildYourOwn: false,
      sortOrder: 1,
      modifierGroups: {
        create: [{ modifierGroupId: size.id }, { modifierGroupId: shape.id }, { modifierGroupId: toppings.id }],
      },
      defaultModifiers: {
        create: [{ modifierId: pepperoni.id }, { modifierId: sausage.id }],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: pizzaCategory.id,
      name: "Build Your Own Pizza",
      basePrice: 10,
      isBuildYourOwn: true,
      sortOrder: 2,
      modifierGroups: {
        create: [{ modifierGroupId: size.id }, { modifierGroupId: shape.id }, { modifierGroupId: toppings.id }],
      },
    },
  });

  console.log("Seeded:", { owner: owner.id, meatLovers: meatLovers.id, mushroom: mushroom.id, onion: onion.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
