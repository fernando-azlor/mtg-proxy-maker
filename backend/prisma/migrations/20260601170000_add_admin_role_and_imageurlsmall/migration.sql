-- Añade el valor ADMIN al enum Role (IF NOT EXISTS evita error si ya existe)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';

-- Añade imageUrlSmall a DeckCard para persistir la miniatura de la carta
ALTER TABLE "DeckCard" ADD COLUMN IF NOT EXISTS "imageUrlSmall" TEXT;
