const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const ruleRoutes = require('./routes/ruleRoutes');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
const mongouri = process.env.MONGO_URI;
// Set view engine to EJS
app.set('view engine', 'ejs');

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(mongouri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.log('MongoDB connection error:', err);
});

// Use routes
app.use('/rules', ruleRoutes);

// Root route
app.get('/', (req, res) => {
  res.render('index');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
