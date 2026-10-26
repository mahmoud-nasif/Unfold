const express = require('express');
const app = express();
const router = express.Router();

app.post('/webhooks/stripe', handleStripe);
router.get('/items', listItems);
app.listen(process.env.PORT);
