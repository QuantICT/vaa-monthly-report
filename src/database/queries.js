export const TENANTS = `SELECT id,name FROM tenant WHERE name IS DISTINCT FROM '__global__';`;

export const TOTAL = `WITH disconnectData AS (
  SELECT sessionId
  FROM disconnectTicket
  WHERE created >= $1::timestamp
    AND created <  $2::timestamp
)
SELECT COUNT(DISTINCT c.sessionId) AS total_records
FROM callTicket c
INNER JOIN disconnectData d ON c.sessionId = d.sessionId
WHERE c.tenant_id = $3;`;

export const CAUSES = `WITH disconnectData AS (
  SELECT *
  FROM disconnectTicket
  WHERE created >= $1::timestamp
    AND created <  $2::timestamp
),
base AS (
  SELECT
    c.sessionId,
    COALESCE(d.cause, 4) AS cause
  FROM callTicket c
  INNER JOIN disconnectData d ON c.sessionId = d.sessionId
  WHERE c.tenant_id = $3
  GROUP BY c.sessionId, d.cause
)
SELECT
  cause,
  COUNT(*) AS total_per_cause
FROM base
GROUP BY cause
ORDER BY cause;`;

export const DETAILS = `WITH disconnectData AS (
  SELECT *
  FROM disconnectTicket
  WHERE created >= $1::timestamp
    AND created <  $2::timestamp
)
SELECT
  c.sessionId AS id,
  c.calling_number AS caller,
  c.called_number AS called,
  te.id AS tenantId,
  te.name AS tenantName,
  t.tree_id AS treeId,
  t.name AS treeName,
  EXTRACT(EPOCH FROM c.created) AS start,
  CASE
    WHEN d.cause IS NULL THEN 0
    ELSE EXTRACT(EPOCH FROM d.created) - EXTRACT(EPOCH FROM c.created)
  END AS duration,
  COUNT(a.nodeid) AS blockRead,
  CASE
    WHEN d.cause IS NULL THEN 4
    ELSE d.cause
  END AS cause,
  d.transferred_to AS transferredTo,
  c.original_calling_number AS forwardedNumber,
  d.reinvited_caller_number AS reinvitedNumber
FROM callTicket c
INNER JOIN disconnectData d
  ON c.sessionId = d.sessionId
LEFT JOIN activityticket a
  ON a.sessionId = d.sessionId
LEFT JOIN tree t
  ON t.tree_id = c.tree_id
LEFT JOIN tenant te
  ON te.id = c.tenant_id
WHERE c.tenant_id = $3
GROUP BY
  c.sessionId,
  te.name,
  c.created,
  d.created,
  d.cause,
  c.calling_number,
  c.called_number,
  t.name,
  te.id,
  t.tree_id,
  c.global_call_id,
  c.correlator_data_in,
  d.correlator_data_out,
  d.transferred_to,
  c.original_calling_number,
  d.reinvited_caller_number
ORDER BY start ASC, c.sessionId ASC;`;
