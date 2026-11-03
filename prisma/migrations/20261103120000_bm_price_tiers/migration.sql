-- AlterTable
ALTER TABLE "MarketProduct" ADD COLUMN     "priceTiers" JSONB NOT NULL DEFAULT '[]';


-- Preços de novembro das BMs 250: sem template 40 (10+ 35, 15+ 30); com template 70 (10+ 60, 15+ 50)
UPDATE "MarketProduct" SET "priceCents" = 4000, "priceTiers" = '[{"min":10,"priceCents":3500},{"min":15,"priceCents":3000}]'
  WHERE "kind" = 'NO_TEMPLATE' AND "name" ILIKE '%250%';
UPDATE "MarketProduct" SET "priceCents" = 7000, "priceTiers" = '[{"min":10,"priceCents":6000},{"min":15,"priceCents":5000}]'
  WHERE "kind" = 'TEMPLATE' AND "name" ILIKE '%250%';
