import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Build Basic Auth token from Payhero credentials
const getAuthToken = () => {
  const credentials = `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`;
  return Buffer.from(credentials).toString('base64');
};

const normalizePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('254') && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith('7') && cleaned.length === 9) return '254' + cleaned;
  return cleaned; // pass through and let PayHero validate
};

// ── User Database Logic (Local JSON file) ───────────────────────────────────
const USERS_FILE = path.join(process.cwd(), 'users.json');

const readUsers = () => {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading users:', err);
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// ── Auth Endpoints ──────────────────────────────────────────────────────────

// POST /api/register - save new user
app.post('/api/register', (req, res) => {
  const { phoneNumber, fullName, idNumber, pin, county, maritalStatus, loanType } = req.body;
  
  if (!phoneNumber || !pin || !fullName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const users = readUsers();
  if (users.find(u => u.phoneNumber === phoneNumber)) {
    return res.status(400).json({ error: 'User already exists with this phone number' });
  }

  const newUser = {
    ...req.body,
    creditLimit: Math.floor(Math.random() * 5001) + 1500, // Random initial limit
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  res.json({ success: true, user: { phoneNumber, fullName, creditLimit: newUser.creditLimit } });
});

// POST /api/login - verify phone/pin
app.post('/api/login', (req, res) => {
  const { phoneNumber, pin } = req.body;
  if (!phoneNumber || !pin) {
    return res.status(400).json({ error: 'Phone number and PIN are required' });
  }

  const users = readUsers();
  const user = users.find(u => u.phoneNumber === phoneNumber && u.pin === pin);

  if (!user) {
    return res.status(401).json({ error: 'Invalid phone number or PIN' });
  }

  res.json({
    success: true,
    user: {
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      creditLimit: user.creditLimit || 5000,
      idNumber: user.idNumber,
    }
  });
});

// Callback endpoint — PayHero posts payment notifications here
app.post('/api/payhero-callback', (req, res) => {
  console.log('💳 PayHero callback received:', JSON.stringify(req.body, null, 2));
  res.json({ status: 'received' });
});

// POST /api/stk-push — triggers an M-Pesa STK push via Payhero
app.post('/api/stk-push', async (req, res) => {
  const { amount, phone_number, external_reference } = req.body;

  if (!amount || !phone_number) {
    return res.status(400).json({ error: 'amount and phone_number are required' });
  }

  const normalizedPhone = normalizePhone(String(phone_number));
  const reference = external_reference || `HELAPESA-${Date.now()}`;
  // Use ngrok/production URL in production; localhost callback is fine for dev testing
  const callbackUrl = process.env.CALLBACK_URL || `http://localhost:${PORT}/api/payhero-callback`;

  console.log(`📤 STK Push → phone: ${normalizedPhone}, amount: ${amount}, ref: ${reference}`);

  try {
    const response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${getAuthToken()}`,
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone_number: normalizedPhone,
        channel_id: Number(process.env.PAYHERO_CHANNEL_ID),
        provider: 'm-pesa',
        external_reference: reference,
        callback_url: callbackUrl,
      }),
    });

    const data = await response.json();
    console.log('📨 PayHero response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ Payhero error:', data);
      return res.status(response.status).json({ error: data });
    }

    res.json({ ...data, reference });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payment-status/:reference — check payment status
app.get('/api/payment-status/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await fetch(
      `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${reference}`,
      {
        headers: {
          Authorization: `Basic ${getAuthToken()}`,
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({ error: 'Could not check payment status' });
  }
});

app.listen(PORT, () => {
  console.log(`✅  Hela Pesa backend running on http://localhost:${PORT}`);
});
