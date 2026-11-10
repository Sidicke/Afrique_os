-- Correctif C1 — Scope l'unicité de la clé d'idempotence par endpoint.
--
-- PROBLÈME : `IdempotencyKey.key` portait une contrainte UNIQUE globale. Le
-- client navigateur réutilise une même clé UUID sur deux endpoints distincts
-- (création de commande puis création de facture de paiement). La 2e requête
-- récupérait alors en cache la réponse de la 1e — une charge utile d'un AUTRE
-- type — et ne créait jamais la transaction de paiement. Conséquence : le
-- client affichait « Paiement confirmé » alors qu'aucun paiement n'avait eu
-- lieu et que la commande restait PENDING.
--
-- CORRECTIF : l'unicité devient COMPOSITE (key, path). Les caches de deux
-- endpoints distincts sont indépendants, tandis que l'idempotence reste
-- garantie à l'intérieur d'un même endpoint (une clé rejouée sur le même path
-- renvoie toujours la même réponse).
--
-- Sûr pour les données existantes : `key` étant globalement unique, il ne
-- pouvait pas exister deux lignes partageant le même couple (key, path).
-- La nouvelle contrainte est donc toujours respectée par le données atuais.

-- Suppression de l'unicité globale sur `key`.
DROP INDEX "IdempotencyKey_key_key";

-- Unicité composite : une clé par couple (clé, endpoint).
CREATE UNIQUE INDEX "IdempotencyKey_key_path_key" ON "IdempotencyKey"("key", "path");
