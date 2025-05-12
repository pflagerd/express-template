const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Set default static files directory
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Optional: enable directory listings (requires serve-index)
const serveIndex = require('serve-index');
app.use('/', serveIndex(publicDir, { icons: true }));

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
