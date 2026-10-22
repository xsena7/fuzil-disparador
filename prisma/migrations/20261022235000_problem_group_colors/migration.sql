-- Grupos automáticos de problema sempre com a cor do tipo (o antigo "BMs com problema" virou preto)
UPDATE "BmGroup" SET "color" = 'red' WHERE "system" = 'PROBLEMS_BANNED';
UPDATE "BmGroup" SET "color" = 'amber' WHERE "system" = 'PROBLEMS_PAYMENT';
UPDATE "BmGroup" SET "color" = 'sky' WHERE "system" = 'PROBLEMS_TEMPLATE';
UPDATE "BmGroup" SET "color" = 'pink' WHERE "system" = 'PROBLEMS_QUALITY';
UPDATE "BmGroup" SET "color" = 'black' WHERE "system" = 'PROBLEMS';
