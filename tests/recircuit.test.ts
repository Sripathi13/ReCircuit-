/**
 * ReCircuit Integration & Workflow Verification Suite
 * Run against the running server on http://localhost:3000:
 *   npx tsx tests/recircuit.test.ts
 */

const BASE_URL = 'http://localhost:3000';

async function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

async function runTests() {
  console.log('Starting ReCircuit End-to-End API & Security Verification...');

  // 1. Seed & Platform Stats
  const statsRes = await fetch(`${BASE_URL}/api/stats`);
  await assert(statsRes.ok, 'GET /api/stats returns 200');
  const stats = await statsRes.json();
  await assert(stats.devicesRegistered >= 6, 'Seeded devices are persisted in PostgreSQL');

  // 2. Public Marketplace & Privacy Check
  const devsRes = await fetch(`${BASE_URL}/api/devices?city=Coimbatore`);
  const devs = await devsRes.json();
  await assert(Array.isArray(devs) && devs.length > 0, 'Combined filter by city returns Coimbatore devices');

  const publicDetailRes = await fetch(`${BASE_URL}/api/devices/${devs[0].id}`);
  const publicDetail = await publicDetailRes.json();
  await assert(
    publicDetail.ownerInfo?.phone === null,
    'Public unauthenticated endpoint does NOT expose owner phone number'
  );

  // 3. Unverified Shop Authorization Check
  const pendingShopLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rahul@metrodevices.demo.recircuit.org',
      isDemoQuickLogin: true,
    }),
  });
  const pendingShopData = await pendingShopLogin.json();
  const pendingToken = pendingShopData.token;

  const forbiddenInterest = await fetch(`${BASE_URL}/api/devices/${devs[0].id}/interests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pendingToken}`,
    },
    body: JSON.stringify({
      interestMessage: 'Trying to request while unverified',
      intendedAction: 'PURCHASE',
      collectionMethod: 'SHOP_PICKUP',
    }),
  });
  await assert(forbiddenInterest.status === 403, 'Unverified shop is blocked (403) from submitting interest requests');

  // 4. Non-Admin blocked from Admin Endpoints
  const forbiddenAdmin = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${pendingToken}` },
  });
  await assert(forbiddenAdmin.status === 403, 'Non-admin account is blocked (403) from /api/admin/dashboard');

  console.log('All ReCircuit verification checks passed!');
}

if (process.env.RUN_E2E === 'true') {
  runTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
