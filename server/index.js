require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const authRoutes = require('./routes/auth');
const leaveRoutes = require('./routes/leaves');
const leaveTypeRoutes = require('./routes/leaveTypes');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message, timestamp: new Date().toISOString() });
  }
});

app.listen(PORT, () => {
  console.log(`BlueSPACE Leave API running on port ${PORT}`);
});
