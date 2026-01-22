-- Inserisce 5 colori base per ogni tessuto che esiste
-- Usa colori HEX, senza texture (l'app userà il colore solido come fallback visivo)

INSERT INTO colors (fabric_id, name, hex_value)
SELECT id, 'Grigio Chiaro', '#D3D3D3' FROM fabrics
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE colors.fabric_id = fabrics.id AND colors.name = 'Grigio Chiaro');

INSERT INTO colors (fabric_id, name, hex_value)
SELECT id, 'Antracite', '#333333' FROM fabrics
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE colors.fabric_id = fabrics.id AND colors.name = 'Antracite');

INSERT INTO colors (fabric_id, name, hex_value)
SELECT id, 'Beige', '#F5F5DC' FROM fabrics
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE colors.fabric_id = fabrics.id AND colors.name = 'Beige');

INSERT INTO colors (fabric_id, name, hex_value)
SELECT id, 'Blu Navy', '#000080' FROM fabrics
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE colors.fabric_id = fabrics.id AND colors.name = 'Blu Navy');

INSERT INTO colors (fabric_id, name, hex_value)
SELECT id, 'Bianco Ghiaccio', '#F0F8FF' FROM fabrics
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE colors.fabric_id = fabrics.id AND colors.name = 'Bianco Ghiaccio');
