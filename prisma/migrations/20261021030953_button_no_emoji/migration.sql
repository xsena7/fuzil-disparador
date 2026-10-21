-- A Meta não aceita emoji em botão: "Recebi ✅" vira "Recebi" e as cópias que deram erro são criadas de novo
UPDATE "TemplateBlueprint" SET components = replace(components::text, '"Recebi ✅"', '"Recebi"')::jsonb WHERE components::text LIKE '%Recebi ✅%';
DELETE FROM "TemplateDeployment" WHERE status = 'ERROR' AND error ILIKE '%Button%';
