/**
 * Contact Service - Handles contact storage and retrieval
 */

import pool from '../db/pool.js';
import logger from '../utils/logger.js';

/**
 * Store or update contact
 */
export async function storeContact(contactData) {
  const {
    whatsapp_id,
    session_name,
    contact_type,
    name,
    push_name,
    phone_number,
    group_name,
    group_description,
    group_participants,
    profile_picture_url,
    is_contact,
  } = contactData;
  
  const query = `
    INSERT INTO whatsapp_gateway.contacts (
      whatsapp_id, session_name, contact_type, name, push_name, phone_number,
      group_name, group_description, group_participants,
      profile_picture_url, is_contact,
      is_group, last_seen_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (whatsapp_id, session_name) DO UPDATE
    SET name = COALESCE(EXCLUDED.name, contacts.name),
        push_name = COALESCE(EXCLUDED.push_name, contacts.push_name),
        phone_number = COALESCE(EXCLUDED.phone_number, contacts.phone_number),
        group_name = COALESCE(EXCLUDED.group_name, contacts.group_name),
        group_description = COALESCE(EXCLUDED.group_description, contacts.group_description),
        group_participants = COALESCE(EXCLUDED.group_participants, contacts.group_participants),
        profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, contacts.profile_picture_url),
        is_contact = COALESCE(EXCLUDED.is_contact, contacts.is_contact),
        last_seen_at = NOW(),
        updated_at = NOW()
    RETURNING id
  `;
  
  const values = [
    whatsapp_id,
    session_name,
    contact_type,
    name || null,
    push_name || null,
    phone_number || null,
    group_name || null,
    group_description || null,
    group_participants ? JSON.stringify(group_participants) : null,
    profile_picture_url || null,
    is_contact || false,
    contact_type === 'group',
  ];
  
  try {
    const result = await pool.query(query, values);
    logger.debug('Contact stored', { whatsapp_id, session_name });
    return result.rows[0].id;
  } catch (error) {
    logger.error('Failed to store contact', {
      error: error.message,
      whatsapp_id,
    });
    throw error;
  }
}

/**
 * Get contacts for a session
 */
export async function getContacts(sessionName, { limit = 100, offset = 0, type = null }) {
  const query = `
    SELECT
      id, whatsapp_id, session_name, contact_type, name, push_name,
      phone_number, group_name, is_group, is_contact,
      last_seen_at, created_at
    FROM whatsapp_gateway.contacts
    WHERE session_name = $1
      ${type ? 'AND contact_type = $4' : ''}
    ORDER BY last_seen_at DESC NULLS LAST
    LIMIT $2
    OFFSET $3
  `;
  
  const values = type
    ? [sessionName, limit, offset, type]
    : [sessionName, limit, offset];
  
  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Get contact by WhatsApp ID
 */
export async function getContactByWhatsappId(sessionName, whatsappId) {
  const query = `
    SELECT * FROM whatsapp_gateway.contacts
    WHERE session_name = $1 AND whatsapp_id = $2
  `;
  
  const result = await pool.query(query, [sessionName, whatsappId]);
  return result.rows[0];
}

