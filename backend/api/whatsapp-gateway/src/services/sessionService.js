/**
 * Session Service - Handles WhatsApp session management
 */

import pool from '../db/pool.js';
import logger from '../utils/logger.js';

/**
 * Update session status
 */
export async function updateSessionStatus(sessionName, status, data = {}) {
  const { qrCode, whatsappId, phoneNumber, profileName } = data;
  
  const query = `
    INSERT INTO whatsapp_gateway.sessions (
      session_name, status, qr_code, qr_code_generated_at,
      whatsapp_id, phone_number, profile_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (session_name) DO UPDATE
    SET status = EXCLUDED.status,
        qr_code = COALESCE(EXCLUDED.qr_code, sessions.qr_code),
        qr_code_generated_at = COALESCE(EXCLUDED.qr_code_generated_at, sessions.qr_code_generated_at),
        whatsapp_id = COALESCE(EXCLUDED.whatsapp_id, sessions.whatsapp_id),
        phone_number = COALESCE(EXCLUDED.phone_number, sessions.phone_number),
        profile_name = COALESCE(EXCLUDED.profile_name, sessions.profile_name),
        updated_at = NOW()
  `;
  
  const values = [
    sessionName,
    status,
    qrCode || null,
    qrCode ? new Date() : null,
    whatsappId || null,
    phoneNumber || null,
    profileName || null,
  ];
  
  try {
    await pool.query(query, values);
    
    // Call session status functions if connected/disconnected
    if (status === 'connected') {
      await pool.query(
        'SELECT whatsapp_gateway.connect_session($1, $2, $3)',
        [sessionName, whatsappId, phoneNumber]
      );
    } else if (status === 'disconnected' || status === 'failed') {
      await pool.query(
        'SELECT whatsapp_gateway.disconnect_session($1, $2)',
        [sessionName, data.reason || null]
      );
    }
    
    logger.info('Session status updated', { session_name: sessionName, status });
  } catch (error) {
    logger.error('Failed to update session status', {
      error: error.message,
      session_name: sessionName,
    });
    throw error;
  }
}

/**
 * Get session by name
 */
export async function getSession(sessionName) {
  const query = `
    SELECT * FROM whatsapp_gateway.sessions
    WHERE session_name = $1
  `;
  
  const result = await pool.query(query, [sessionName]);
  return result.rows[0];
}

/**
 * Get all active sessions
 */
export async function getActiveSessions() {
  const query = `
    SELECT * FROM whatsapp_gateway.active_sessions
    ORDER BY last_heartbeat_at DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Update session heartbeat
 */
export async function updateHeartbeat(sessionName) {
  await pool.query(
    'SELECT whatsapp_gateway.update_session_heartbeat($1)',
    [sessionName]
  );
}

