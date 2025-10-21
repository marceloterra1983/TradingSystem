const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'specs')));

const port = process.env.PORT || 3000;

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'specs', 'portal.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`DocsAPI listening at http://localhost:${port}`);
});
