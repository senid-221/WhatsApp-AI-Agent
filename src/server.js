import express from "express";
import dotenv from "dotenv";
import whatsappRouter from "./routes/whatsapp.js";
import { initDatabase } from "./services/database.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({ name: "LUMIA", status: "online" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "LUMIA" });
});

app.get("/api/marketplace/products", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query("SELECT * FROM marketplace_products WHERE in_stock = TRUE ORDER BY id DESC");
    res.json({ products: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Unable to load products" });
  }
});

app.post("/api/marketplace/orders", async (req, res) => {
  try {
    const { customerName, phone, productId, quantity = 1 } = req.body;
    if (!customerName || !phone || !productId) return res.status(400).json({ error: "customerName, phone and productId are required" });
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query(
      "INSERT INTO marketplace_orders (customer_name, phone, product_id, quantity) VALUES ($1,$2,$3,$4) RETURNING *",
      [customerName, phone, productId, quantity]
    );
    res.status(201).json({ order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Unable to create order" });
  }
});

app.post("/api/portal/marketplace/products", async (req, res) => {
  try {
    const { name, category, description = "", price = 0, currency = "RWF", imageUrl = "", inStock = true } = req.body;
    if (!name || !category) return res.status(400).json({ error: "name and category are required" });
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query(
      "INSERT INTO marketplace_products (name, category, description, price, currency, image_url, in_stock) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [name, category, description, price, currency, imageUrl, inStock]
    );
    res.status(201).json({ product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Unable to create product" });
  }
});

app.put("/api/portal/marketplace/products/:id", async (req, res) => {
  try {
    const { name, category, description, price, currency, imageUrl, inStock } = req.body;
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query(
      "UPDATE marketplace_products SET name=$1, category=$2, description=$3, price=$4, currency=$5, image_url=$6, in_stock=$7 WHERE id=$8 RETURNING *",
      [name, category, description || "", price || 0, currency || "RWF", imageUrl || "", inStock !== false, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Product not found" });
    res.json({ product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Unable to update product" });
  }
});

app.delete("/api/portal/marketplace/products/:id", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query("DELETE FROM marketplace_products WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Unable to delete product" });
  }
});

app.patch("/api/portal/marketplace/orders/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "rejected", "completed"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query("UPDATE marketplace_orders SET status=$1 WHERE id=$2 RETURNING *", [status, req.params.id]);
    res.json({ order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Unable to update order" });
  }
});

app.get("/api/portal/marketplace/orders", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query(
      "SELECT o.*, p.name AS product_name, p.image_url FROM marketplace_orders o LEFT JOIN marketplace_products p ON p.id=o.product_id ORDER BY o.created_at DESC"
    );
    res.json({ orders: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Unable to load orders" });
  }
});

app.get("/api/portal/conversations", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const db = getDatabase();
    const result = await db.query("SELECT phone, MAX(created_at) AS last_message_at, COUNT(*)::int AS message_count FROM conversation_messages GROUP BY phone ORDER BY last_message_at DESC");
    res.json({ conversations: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/portal/history", async (req, res) => {
  try {
    const customer = String(req.query.customer || "");
    if (!customer) return res.status(400).json({ error: "customer is required" });
    const { getDatabase } = await import("./services/database.js");
    const db = getDatabase();
    const result = await db.query(
      "SELECT role, text, created_at FROM conversation_messages WHERE phone = $1 ORDER BY created_at ASC",
      [customer]
    );
    res.json({ customer, messages: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Unable to load history" });
  }
});


app.post("/api/marketplace/partners/apply", async (req,res)=>{
  try {
    const { businessName, ownerName, phone, whatsappNumber, location="", businessCategory="", description="", onlineStoreUrl="", paymentReference="" } = req.body;
    if(!businessName || !ownerName || !phone || !whatsappNumber) return res.status(400).json({error:"businessName, ownerName, phone and whatsappNumber are required"});
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query(
      "INSERT INTO marketplace_partners (business_name,owner_name,phone,whatsapp_number,location,business_category,description,online_store_url,payment_reference,payment_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
      [businessName,ownerName,phone,whatsappNumber,location,businessCategory,description,onlineStoreUrl,paymentReference,paymentReference?"submitted":"unpaid"]
    );
    res.status(201).json({partner:result.rows[0],payment:{amount:40000,currency:"RWF",method:"MOMO PAY",code:"935237"}});
  } catch(error){res.status(500).json({error:"Unable to submit partner application"});}
});

app.get("/api/portal/partners", async (req,res)=>{
  try { const {getDatabase}=await import("./services/database.js"); const result=await getDatabase().query("SELECT * FROM marketplace_partners ORDER BY created_at DESC"); res.json({partners:result.rows}); }
  catch(error){res.status(500).json({error:"Unable to load partners"});}
});

app.patch("/api/portal/partners/:id", async (req,res)=>{
  try {
    const {status,paymentStatus}=req.body;
    const allowed=["pending","approved","rejected","suspended"];
    const payAllowed=["unpaid","submitted","verified","rejected"];
    if(status && !allowed.includes(status)) return res.status(400).json({error:"Invalid partner status"});
    if(paymentStatus && !payAllowed.includes(paymentStatus)) return res.status(400).json({error:"Invalid payment status"});
    const {getDatabase}=await import("./services/database.js");
    const result=await getDatabase().query(
      "UPDATE marketplace_partners SET status=COALESCE($1,status), payment_status=COALESCE($2,payment_status), approved_at=CASE WHEN $1='approved' THEN NOW() ELSE approved_at END WHERE id=$3 RETURNING *",
      [status||null,paymentStatus||null,req.params.id]
    );
    if(!result.rows[0]) return res.status(404).json({error:"Partner not found"});
    res.json({partner:result.rows[0]});
  } catch(error){res.status(500).json({error:"Unable to update partner"});}
});

app.post("/api/portal/partners/:id/products", async (req,res)=>{
  try {
    const {name,category,description="",price=0,currency="RWF",imageUrl="",inStock=true}=req.body;
    if(!name||!category)return res.status(400).json({error:"name and category are required"});
    const {getDatabase}=await import("./services/database.js");
    const result=await getDatabase().query("INSERT INTO partner_products (partner_id,name,category,description,price,currency,image_url,in_stock) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[req.params.id,name,category,description,price,currency,imageUrl,inStock]);
    res.status(201).json({product:result.rows[0]});
  }catch(error){res.status(500).json({error:"Unable to create partner product"});}
});

app.get("/api/marketplace/partner-products", async (req,res)=>{
  try {
    const {getDatabase}=await import("./services/database.js");
    const result=await getDatabase().query("SELECT pp.*,p.business_name,p.whatsapp_number,p.online_store_url FROM partner_products pp JOIN marketplace_partners p ON p.id=pp.partner_id WHERE pp.in_stock=TRUE AND p.status='approved' ORDER BY pp.id DESC");
    res.json({products:result.rows});
  }catch(error){res.status(500).json({error:"Unable to load partner products"});}
});

app.post("/api/marketplace/partner-orders", async (req,res)=>{
  try {
    const {partnerId,partnerProductId,customerName="",customerPhone,customerWhatsapp="",productName,quantity=1,paymentMethod="cash_on_delivery",paymentStatus="pending"}=req.body;
    if(!partnerId||!customerPhone||!productName)return res.status(400).json({error:"partnerId, customerPhone and productName are required"});
    const {getDatabase}=await import("./services/database.js");
    const db=getDatabase();
    const partner=(await db.query("SELECT * FROM marketplace_partners WHERE id=$1 AND status='approved'",[partnerId])).rows[0];
    if(!partner)return res.status(404).json({error:"Approved partner not found"});
    const proof=`LUMIA Marketplace Proof: ${customerName||"Customer"} requested ${productName} (Qty: ${quantity}). Customer WhatsApp: ${customerWhatsapp||customerPhone}. Payment: ${paymentMethod}. Status: ${paymentStatus}.`;
    const result=await db.query("INSERT INTO partner_orders (partner_id,partner_product_id,customer_name,customer_phone,customer_whatsapp,product_name,quantity,payment_method,payment_status,proof_message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",[partnerId,partnerProductId||null,customerName,customerPhone,customerWhatsapp,productName,quantity,paymentMethod,paymentStatus,proof]);
    const {sendWhatsAppMessage}=await import("./services/whatsapp.js");
    try{await sendWhatsAppMessage(partner.whatsapp_number,proof);}catch(e){console.warn("Partner notification failed:",e.response?.data||e.message);}
    res.status(201).json({order:result.rows[0],proof});
  }catch(error){res.status(500).json({error:"Unable to create partner order"});}
});


app.use("/webhook", whatsappRouter);

app.get("/api/portal/overview", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const db = getDatabase();
    const conversations = await db.query("SELECT COUNT(*)::int AS count FROM conversation_sessions");
    const messages = await db.query("SELECT COUNT(*)::int AS count FROM conversation_messages");
    const contacts = await db.query("SELECT COUNT(DISTINCT phone)::int AS count FROM conversation_messages");

    res.json({
      agent: { name: "LUMIA", status: "online", memoryHours: 12, database: "PostgreSQL" },
      stats: {
        conversations: conversations.rows[0].count,
        messages: messages.rows[0].count,
        contacts: contacts.rows[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;

async function startServer() {
  await initDatabase();

  app.listen(port, "0.0.0.0", () => {
    console.log(`LUMIA backend running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("LUMIA failed to start:", error.message);
  process.exit(1);
});
