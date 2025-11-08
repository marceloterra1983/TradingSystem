import { getDatabasePool } from "./messagesRepository.js";

const parseChannelId = (value) => {
  try {
    if (typeof value === "undefined" || value === null) {
      throw new Error("channelId vazio");
    }
    const asString = String(value).trim();
    if (!asString) {
      throw new Error("channelId vazio");
    }
    // Validate using BigInt but return normalized string to avoid pg BigInt param issues
    const normalized = BigInt(asString).toString();
    return normalized;
  } catch (error) {
    const err = new Error(`Canal inválido: ${error.message}`);
    err.code = "INVALID_CHANNEL_ID";
    throw err;
  }
};

const mapChannelRow = (row) => ({
  id: row.id,
  channelId: row.channel_id,
  label: row.label,
  description: row.description,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listChannels = async ({ logger }) => {
  const db = await getDatabasePool(logger);
  // search_path is set by messagesRepository to the configured schema,
  // so we can reference unqualified table names safely here.
  const result = await db.query(
    `SELECT id, channel_id, label, description, is_active, created_at, updated_at
     FROM channels
     ORDER BY created_at DESC`,
  );
  return result.rows.map(mapChannelRow);
};

export const createChannel = async ({
  channelId,
  label,
  description,
  isActive = true,
  logger,
}) => {
  const db = await getDatabasePool(logger);
  const numericChannelId = parseChannelId(channelId);

  const result = await db.query(
    `INSERT INTO channels (channel_id, label, description, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING id, channel_id, label, description, is_active, created_at, updated_at`,
    [numericChannelId, label || null, description || null, Boolean(isActive)],
  );

  return mapChannelRow(result.rows[0]);
};

export const updateChannel = async (
  id,
  { label, description, isActive, channelId },
  { logger },
) => {
  const db = await getDatabasePool(logger);

  const updates = [];
  const values = [];
  let index = 1;

  if (typeof channelId !== "undefined") {
    updates.push(`channel_id = $${index}`);
    values.push(parseChannelId(channelId));
    index += 1;
  }

  if (typeof label !== "undefined") {
    updates.push(`label = $${index}`);
    values.push(label || null);
    index += 1;
  }

  if (typeof description !== "undefined") {
    updates.push(`description = $${index}`);
    values.push(description || null);
    index += 1;
  }

  if (typeof isActive !== "undefined") {
    updates.push(`is_active = $${index}`);
    values.push(Boolean(isActive));
    index += 1;
  }

  if (updates.length === 0) {
    const error = new Error("Nenhuma mudança fornecida");
    error.code = "NO_CHANGES";
    throw error;
  }

  values.push(id);

  const result = await db.query(
    `UPDATE channels
     SET ${updates.join(", ")}
     WHERE id = $${index}
     RETURNING id, channel_id, label, description, is_active, created_at, updated_at`,
    values,
  );

  if (result.rows.length === 0) {
    const error = new Error("Canal não encontrado");
    error.code = "NOT_FOUND";
    throw error;
  }

  return mapChannelRow(result.rows[0]);
};

export const deleteChannel = async (id, { logger }) => {
  const db = await getDatabasePool(logger);
  const result = await db.query(
    `DELETE FROM channels WHERE id = $1 RETURNING id`,
    [id],
  );

  if (result.rows.length === 0) {
    const error = new Error("Canal não encontrado");
    error.code = "NOT_FOUND";
    throw error;
  }
};
