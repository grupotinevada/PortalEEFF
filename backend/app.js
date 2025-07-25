const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const balanceRoutes = require('./routes/balance.routes');
const mappingRoutes = require('./routes/mapping.routes');
const defaultMappingRoutes = require('./routes/defaultMapping.routes');
const empresaRoutes = require('./routes/empresas.routes');
const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://192.168.195.65:4200',
    'https://portaleefftest.inevada.cl',
    'https://portaleeffapitest.inevada.cl',
    'https://portaleefftest.inevada.cl/login'
  ],
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

// Rutas
app.use('/api/auth', authRoutes);

//Balance Routes
app.use('/api/blce/upld', balanceRoutes)

// mapping Routes
app.use('/api/mapping', mappingRoutes);

// mapping Empresa
app.use('/api/empresa', empresaRoutes);

// Default Mapping Routes
app.use('/api/default-mapping', defaultMappingRoutes);



// Agrega el router
app.use('/api', balanceRoutes);




module.exports = app;