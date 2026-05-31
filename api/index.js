import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

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
  return cleaned;
};

// ── User Database Logic (Vercel note: users.json is non-persistent in serverless) ───
const USERS_FILE = path.join('/tmp', 'users.json'); // Use /tmp for limited lifetime persistence on Vercel

const readUsers = () => {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {}
};

// ── Auth Endpoints ──────────────────────────────────────────────────────────

app.post('/api/register', (req, res) => {
  const { phoneNumber, fullName, idNumber, pin } = req.body;
  if (!phoneNumber || !pin || !fullName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const users = readUsers();
  if (users.find(u => u.phoneNumber === phoneNumber)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const newUser = {
    ...req.body,
    creditLimit: Math.floor(Math.random() * 5001) + 1500,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  res.json({ success: true, user: { phoneNumber, fullName, creditLimit: newUser.creditLimit } });
});

app.post('/api/login', (req, res) => {
  const { phoneNumber, pin } = req.body;
  const users = readUsers();
  const user = users.find(u => u.phoneNumber === phoneNumber && u.pin === pin);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
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

app.post('/api/payhero-callback', (req, res) => {
  res.json({ status: 'received' });
});

app.post('/api/stk-push', async (req, res) => {
  const { amount, phone_number, external_reference } = req.body;
  const normalizedPhone = normalizePhone(String(phone_number));
  const reference = external_reference || `HELAPESA-${Date.now()}`;
  const callbackUrl = process.env.CALLBACK_URL;

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
    if (!response.ok) return res.status(response.status).json({ error: data });
    res.json({ ...data, reference });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/payment-status/:reference', async (req, res) => {
  try {
    const response = await fetch(
      `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${req.params.reference}`,
      { headers: { Authorization: `Basic ${getAuthToken()}` } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Could not check status' });
  }
});

// For local testing, we still use app.listen, but Vercel uses the export
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

export default app;
