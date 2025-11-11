import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 9876;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Docker commands endpoint
app.post('/', async (req, res) => {
  try {
    const { action, container } = req.body;

    if (!action || !container) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, container'
      });
    }

    // Whitelist allowed containers (security)
    const allowedContainers = [
      'course-crawler-worker',
      'course-crawler-api',
      'course-crawler-ui',
      'course-crawler-db'
    ];

    if (!allowedContainers.includes(container)) {
      return res.status(403).json({
        success: false,
        error: `Container '${container}' is not allowed`
      });
    }

    let command = '';

    switch (action) {
      case 'logs':
        // Get last 100 lines of logs
        command = `docker logs --tail 100 ${container} 2>&1`;
        break;

      case 'status':
        command = `docker inspect --format='{{.State.Status}}' ${container} 2>&1`;
        break;

      case 'restart':
        command = `docker restart ${container} 2>&1`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`
        });
    }

    console.log(`[Docker Control] Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    const output = stdout || stderr;

    res.json({
      success: true,
      output: output.trim(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Docker Control] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐳 Docker Control Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
