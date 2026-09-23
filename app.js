const express = require('express');

const app = express();

app.get('/', (req, res) => {
    res.json({
        message: 'Hello from Node.js Docker App!',
        version: '1.0'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Application running on port ${PORT}`);
});