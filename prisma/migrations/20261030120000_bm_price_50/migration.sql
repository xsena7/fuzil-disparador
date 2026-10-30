-- Preço das BMs à venda em /vendas: de R$ 70,00 para R$ 50,00 (só os produtos que estavam a 70; pedidos já feitos não mudam)
UPDATE "MarketProduct" SET "priceCents" = 5000 WHERE "priceCents" = 7000;
