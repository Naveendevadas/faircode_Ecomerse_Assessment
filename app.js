
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const connectDB = require('./db/config');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth',       require('./routes/authRoutes'));
app.use('/products',   require('./routes/productRoutes'));
app.use('/cart',       require('./routes/cartRoutes'));
app.use('/orders',     require('./routes/orderRoutes'));
app.use('/payment',    require('./routes/paymentRoutes'));
app.use('/flashsale',  require('./routes/flashSaleRoutes'));
app.use('/admin',      require('./routes/adminRoutes'));
app.use('/banners',    require('./routes/bannerRoutes'));
app.use('/categories', require('./routes/categoryRoutes'));
app.use('/addresses',  require('./routes/addressRoutes'));

app.use((req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
connectDB(app, PORT);