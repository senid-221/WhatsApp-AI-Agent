import pg from "pg";

const { Pool } = pg;
let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in Render.");
  }

  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on("error", (error) => {
      console.error("PostgreSQL pool error:", error.message);
    });
  }

  return pool;
}

export async function initDatabase() {
  const db = getPool();

  await db.query(
    "CREATE TABLE IF NOT EXISTS conversation_sessions (phone TEXT PRIMARY KEY, session_started_at TIMESTAMPTZ NOT NULL, last_user_message_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );

  await db.query(
    "CREATE TABLE IF NOT EXISTS conversation_messages (id BIGSERIAL PRIMARY KEY, phone TEXT NOT NULL, session_started_at TIMESTAMPTZ NOT NULL, role TEXT NOT NULL CHECK (role IN ('user', 'assistant')), text TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );

  await db.query(
    "CREATE INDEX IF NOT EXISTS conversation_messages_phone_session_idx ON conversation_messages (phone, session_started_at, id)"
  );

  await db.query(`CREATE TABLE IF NOT EXISTS marketplace_products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price NUMERIC(14,2),
    currency TEXT NOT NULL DEFAULT 'RWF',
    image_url TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS marketplace_orders (
    id BIGSERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    product_id BIGINT REFERENCES marketplace_products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);


  await db.query(`CREATE TABLE IF NOT EXISTS marketplace_partners (
    id BIGSERIAL PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    location TEXT,
    business_category TEXT,
    description TEXT,
    online_store_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
    application_fee NUMERIC(14,2) NOT NULL DEFAULT 40000,
    payment_method TEXT NOT NULL DEFAULT 'MOMO PAY',
    payment_reference TEXT,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','submitted','verified','rejected')),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS partner_products (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES marketplace_partners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price NUMERIC(14,2),
    currency TEXT NOT NULL DEFAULT 'RWF',
    image_url TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS partner_orders (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES marketplace_partners(id),
    partner_product_id BIGINT REFERENCES partner_products(id),
    customer_name TEXT,
    customer_phone TEXT NOT NULL,
    customer_whatsapp TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    proof_message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await db.query("ALTER TABLE marketplace_partners ADD COLUMN IF NOT EXISTS password_hash TEXT");
  await db.query("ALTER TABLE marketplace_partners ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ");

  const seeded = await db.query("SELECT COUNT(*)::int AS count FROM marketplace_products");
  if (seeded.rows[0].count === 0) {
    const products = [
      ["Classic Shirt","Clothing","Quality everyday shirt",25000,"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80"],
      ["Modern Laptop","Computers","Powerful laptop for work and study",850000,"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"],
      ["Smartphone","Mobile Phones","Modern mobile phone",320000,"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80"],
      ["Flat Screen TV","Electronics","High quality display",650000,"https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80"],
      ["Solar Panel","Solar","Reliable solar energy solution",180000,"https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=80"],
      ["Office Chair","Furniture","Comfortable professional chair",120000,"https://images.unsplash.com/photo-1505843490701-5e58b83b1b20?auto=format&fit=crop&w=900&q=80"],
      ["Football","Sports","Quality football",35000,"https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=80"],
      ["Websites & Apps","Digital Services","Professional websites and mobile applications",0,"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80"]
    ];
    for (const product of products) {
      await db.query("INSERT INTO marketplace_products (name, category, description, price, image_url) VALUES ($1,$2,$3,$4,$5)", product);
    }
  }

  console.log("LUMIA PostgreSQL database connected");
}

export function getDatabase() {
  return getPool();
}
