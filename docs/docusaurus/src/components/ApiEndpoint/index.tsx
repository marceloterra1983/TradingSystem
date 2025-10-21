import React from 'react';
import styles from './styles.module.css';

/**
 * API Endpoint documentation component
 *
 * Usage:
 * ```tsx
 * <ApiEndpoint
 *   method="POST"
 *   path="/api/v1/execute"
 *   description="Execute a trading order"
 *   requestBody={{
 *     symbol: "WINZ25",
 *     side: "BUY",
 *     quantity: 1
 *   }}
 *   responseBody={{
 *     orderId: "12345",
 *     status: "FILLED"
 *   }}
 * />
 * ```
 */

interface ApiEndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  queryParams?: Array<{ name: string; type: string; description: string; required?: boolean }>;
}

export default function ApiEndpoint({
  method,
  path,
  description,
  requestBody,
  responseBody,
  queryParams,
}: ApiEndpointProps) {
  const methodClass = method.toLowerCase();

  return (
    <div className={styles.apiEndpoint}>
      <div className={styles.header}>
        <span className={`${styles.method} ${styles[methodClass]}`}>{method}</span>
        <code className={styles.path}>{path}</code>
      </div>

      <p className={styles.description}>{description}</p>

      {queryParams && queryParams.length > 0 && (
        <div className={styles.section}>
          <h4>Query Parameters</h4>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {queryParams.map((param) => (
                <tr key={param.name}>
                  <td><code>{param.name}</code></td>
                  <td><code>{param.type}</code></td>
                  <td>{param.required ? 'Yes' : 'No'}</td>
                  <td>{param.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {requestBody && (
        <div className={styles.section}>
          <h4>Request Body</h4>
          <pre className={styles.json}>
            {JSON.stringify(requestBody, null, 2)}
          </pre>
        </div>
      )}

      {responseBody && (
        <div className={styles.section}>
          <h4>Response</h4>
          <pre className={styles.json}>
            {JSON.stringify(responseBody, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
