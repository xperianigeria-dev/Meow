import { useEffect, useMemo, useState } from "react";
import Barcode from "react-barcode";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarChart3, Bell, Boxes, ChevronRight, CircleDollarSign, FileText,
  Home, LogOut, Menu, PackagePlus, Receipt, Search, Settings, ShieldCheck,
  ShoppingCart, Sparkles, UserRound, Users, X, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, RefreshCw
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

type Product = {
  id: string; name: string; category: string; price: number; stock: number; sku: string;
  image_url?: string;
low_stock_threshold?: number; active?: boolean;
};

type CartItem = Product & { quantity: number };

const demoProducts: Product[] = [
  { id:"1", name:"Luxury King Beddings", category:"Beddings", price:85000, stock:12, sku:"BED-001" },
  { id:"2", name:"Premium Throw Pillow", category:"Decor", price:12500, stock:8, sku:"DEC-014" },
  { id:"3", name:"Amber Home Fragrance", category:"Fragrances", price:18500, stock:4, sku:"FRA-007" },
  { id:"4", name:"Royal Duvet Set", category:"Beddings", price:65000, stock:19, sku:"BED-009" },
  { id:"5", name:"Gold Accent Vase", category:"Decor", price:22000, stock:3, sku:"DEC-021" },
  { id:"6", name:"Sandalwood Diffuser", category:"Fragrances", price:24000, stock:11, sku:"FRA-011" }
];

const money = (n:number) => new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [profile, setProfile] = useState<{
  id: string;
  full_name: string;
  role: "owner" | "manager" | "cashier";
  phone?: string | null;
  avatar_url?: string | null;
} | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
const client = supabase;

    let mounted = true;
const loadProfile = async (userId: string) => {
  const { data, error } = await client
    .from("profiles")
    .select("id,full_name,role,phone,avatar_url")
    .eq("id", userId)
    .single();

  if (!mounted) return;

  if (error) {
    console.error("Profile load error:", error);
    setProfile(null);
    return;
  }

  setProfile(data);
};

    supabase.auth.getSession().then(async ({ data }) => {
  if (!mounted) return;

  setSession(data.session);

  if (data.session?.user) {
  const user = data.session.user;

  setNeedsPasswordSetup(
    user.user_metadata?.password_setup_required === true
  );

  await loadProfile(user.id);
} else {
  setProfile(null);
  setNeedsPasswordSetup(false);
}

  setAuthLoading(false);
});

    const { data: listener } = supabase.auth.onAuthStateChange(
  async (_event, nextSession) => {
    if (!mounted) return;

    setSession(nextSession);

    if (nextSession?.user) {
      await loadProfile(nextSession.user.id);
    } else {
      setProfile(null);
    }

    setAuthLoading(false);
  }
);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
if (error) setAuthError(error.message);
    setAuthBusy(false);
  }
async function handlePasswordSetup(e: React.FormEvent) {
  e.preventDefault();

  if (!supabase) {
    setAuthError("Supabase is not configured.");
    return;
  }

  if (newPassword.length < 8) {
    setAuthError("Password must be at least 8 characters.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setAuthError("Passwords do not match.");
    return;
  }

  setAuthBusy(true);
  setAuthError("");

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: {
      password_setup_required: false,
    },
  });

  if (error) {
    setAuthError(error.message);
    setAuthBusy(false);
    return;
  }

  setNewPassword("");
  setConfirmPassword("");
  setNeedsPasswordSetup(false);
  setAuthBusy(false);
}
    

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
  }


useEffect(() => {
  async function loadProducts() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        sku,
        name,
        description,
        image_url,
        cost_price,
        selling_price,
        stock_quantity,
        low_stock_threshold,
        is_active,
        categories (
          id,
          name
        )
      `)
      .order("name");

    if (error) {
      console.error("Failed to load products:", error);
      return;
    }

    const liveProducts: Product[] = (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.categories?.name ?? "",
      price: Number(p.selling_price),
      stock: Number(p.stock_quantity),
      sku: p.sku ?? "",
      image_url: p.image_url ?? undefined,
      active: p.is_active,
    }));

    setProducts(liveProducts);
  }

  loadProducts();
}, []);
  const [mobileOpen,setMobileOpen] = useState(false);
  const [page, setPage] = useState("Dashboard");
  const [cart,setCart] = useState<CartItem[]>([]);
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState("All");
  const [toast,setToast] = useState("");
  const [showCheckout,setShowCheckout] = useState(false);
  const [receipt, setReceipt] = useState<{
  receiptNumber: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paymentMethod?: string;
  amountPaid?: number;
} | null>(null);
  const [showProductForm,setShowProductForm] = useState(false);
const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filtered = useMemo(()=>products.filter(p =>
    (category==="All" || p.category===category) &&
    (p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()))
  ),[query,category]);

  const cartTotal = cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const cartCount = cart.reduce((s,i)=>s+i.quantity,0);

  const notify=(text:string)=>{setToast(text);setTimeout(()=>setToast(""),2600)};
  const add=(p:Product)=>setCart(c=>{
    const found=c.find(i=>i.id===p.id);
    return found ? c.map(i=>i.id===p.id?{...i,quantity:Math.min(i.quantity+1,p.stock)}:i) : [...c,{...p,quantity:1}]
  });
  const adjust=(id:string,d:number)=>setCart(c=>c.flatMap(i=>{
    if(i.id!==id) return [i];
    const q=i.quantity+d;
    return q>0 ? [{...i,quantity:Math.min(q,i.stock)}] : [];
  }));
const removeProduct = async (product: Product) => {
  if (!supabase) {
    notify("Supabase is not configured.");
    return;
  }

  const confirmed = window.confirm(
    `Remove "${product.name}" from inventory?\n\nIf this product has sales history, it will be deactivated instead of permanently deleted.`
  );

  if (!confirmed) return;

  try {
    // Check whether this product has ever been sold
    const { count, error: salesCheckError } = await supabase
      .from("sale_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id);

    if (salesCheckError) {
      console.error("Product sales check error:", salesCheckError);
      notify("Could not check product sales history.");
      return;
    }

    if ((count ?? 0) > 0) {
      // Product has sales history — deactivate it
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", product.id);

      if (error) throw error;

      setProducts(current =>
        current.filter(p => p.id !== product.id)
      );

      notify(
        `"${product.name}" has been deactivated because it has sales history.`
      );
    } else {
      // Product has never been sold — permanently delete it
      const { data: deletedProduct, error } = await supabase
  .from("products")
  .delete()
  .eq("id", product.id)
  .select("id")
  .maybeSingle();

if (error) throw error;

if (!deletedProduct) {
  notify("Product could not be deleted. Check your permissions.");
  return;
}

      setProducts(current =>
        current.filter(p => p.id !== product.id)
      );

      notify(`"${product.name}" deleted successfully.`);
    }
  } catch (error: any) {
    console.error("Remove product error:", error);
    notify(error?.message || "Could not remove product.");
  }
};
const removeFromCart = (id: string) => {
  setCart(currentCart =>
    currentCart.filter(item => item.id !== id)
  );
};
const allNav = [
  ["Dashboard", Home],
  ["Point of Sale", ShoppingCart],
  ["Inventory", Boxes],
  ["Sales", Receipt],
  ["Reports", BarChart3],
  ["Audit Logs", Receipt],
  ["Staff", Users],
  ["Settings", Settings]
] as const;

const permissions: Record<
  "owner" | "manager" | "cashier",
  string[]
> = {
  owner: [
  "Dashboard",
  "Point of Sale",
  "Inventory",
  "Sales",
  "Reports",
  "Audit Logs",
  "Staff",
  "Settings"
],

  manager: [
  "Dashboard",
  "Point of Sale",
  "Inventory",
  "Sales",
  "Reports",
  "Audit Logs"
],

  cashier: [
    "Dashboard",
    "Point of Sale",
    "Sales"
  ]
};

const currentRole =
  profile?.role === "manager" || profile?.role === "cashier"
    ? profile.role
    : "owner";

const nav = allNav.filter(([label]) =>
  permissions[currentRole].includes(label)
);
useEffect(() => {
  if (!permissions[currentRole].includes(page)) {
    setPage("Dashboard");
  }
}, [currentRole, page]);
  if (authLoading) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f4f6fb",
        color: "#172033",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <img
          src="/meow-logo.png"
          alt="Meow Edits"
          style={{
            width: 150,
            height: "auto",
            objectFit: "contain",
            marginBottom: 18,
          }}
        />

        <h2 style={{ margin: 0 }}>Starting Meow...</h2>

        <p style={{ color: "#718096" }}>
          Checking your secure session.
        </p>
      </div>
    </div>
  );
}
if (session && needsPasswordSetup) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg,#eef2f7,#f8fafc)",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 24,
      }}
    >
      <form
        onSubmit={handlePasswordSetup}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 24px 70px rgba(15,23,42,.14)",
        }}
      >
        <img
          src="/meow-logo.png"
          alt="Meow Edits"
          style={{
            width: 150,
            height: "auto",
            objectFit: "contain",
            marginBottom: 18,
          }}
        />

        <div
          style={{
            color: "#718096",
            fontSize: 12,
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          XPERIA NIGERIA
        </div>

        <h1
          style={{
            margin: "6px 0 8px",
            color: "#172033",
          }}
        >
          Welcome to Meow
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            color: "#718096",
          }}
        >
          Your staff account is ready. Create your own password to continue.
        </p>

        <label
          style={{
            display: "block",
            marginBottom: 16,
            color: "#526079",
          }}
        >
          New password
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Create your password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 7,
              padding: "13px 14px",
              border: "1px solid #d9e0ea",
              borderRadius: 12,
              fontSize: 15,
              outline: "none",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginBottom: 16,
            color: "#526079",
          }}
        >
          Confirm password
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 7,
              padding: "13px 14px",
              border: "1px solid #d9e0ea",
              borderRadius: 12,
              fontSize: 15,
              outline: "none",
            }}
          />
        </label>

        {authError && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#fff1f2",
              color: "#c53030",
              fontSize: 14,
            }}
          >
            {authError}
          </div>
        )}

        <button
          type="submit"
          disabled={authBusy}
          style={{
            width: "100%",
            padding: "14px 16px",
            border: "none",
            borderRadius: 12,
            background: "#111a2c",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: authBusy ? "wait" : "pointer",
          }}
        >
          {authBusy ? "Saving password..." : "Create Password"}
        </button>
      </form>
    </div>
  );
}

  if (!supabase || !session) {
    return (
      <div style={{
        minHeight: "100vh", display: "grid", placeItems: "center",
        background: "linear-gradient(135deg,#eef2f7,#f8fafc)",
        fontFamily: "Inter, Arial, sans-serif", padding: 24
      }}>
        <form onSubmit={handleLogin} style={{
          width: "100%", maxWidth: 420, background: "#fff", borderRadius: 24,
          padding: 32, boxShadow: "0 24px 70px rgba(15,23,42,.14)"
        }}>
          <img
  src="/meow-logo.png"
  alt="Meow Edits"
  style={{
    width: 150,
    height: "auto",
    objectFit: "contain",
    marginBottom: 18,
  }}
/>
          <div style={{ color: "#718096", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
            XPERIA NIGERIA
          </div>
          <h1 style={{ margin: "6px 0 8px", color: "#172033" }}>Welcome to Meow</h1>
          <p style={{ margin: "0 0 24px", color: "#718096" }}>
            Sign in to access the cashier and inventory system.
          </p>

          <label style={{ display: "block", marginBottom: 16, color: "#526079", fontSize: 14 }}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              style={{
                width: "100%", boxSizing: "border-box", marginTop: 7, padding: "13px 14px",
                border: "1px solid #d9e0ea", borderRadius: 12, fontSize: 15, outline: "none"
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 14, color: "#526079", fontSize: 14 }}>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{
                width: "100%", boxSizing: "border-box", marginTop: 7, padding: "13px 14px",
                border: "1px solid #d9e0ea", borderRadius: 12, fontSize: 15, outline: "none"
              }}
            />
          </label>

          {authError && (
            <div style={{
              background: "#fff1f2", color: "#b42318", border: "1px solid #fecdd3",
              borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13
            }}>
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={authBusy}
            style={{
              width: "100%", border: 0, borderRadius: 12, padding: "14px 16px",
              background: "#111a2c", color: "#fff", fontSize: 16, fontWeight: 700,
              cursor: authBusy ? "wait" : "pointer", opacity: authBusy ? .7 : 1
            }}
          >
            {authBusy ? "Signing in..." : "Sign in to Meow"}
          </button>

          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 18 }}>
            Secure access powered by Supabase Auth
          </p>
        </form>
      </div>
    );
  }



  return <div className="app">
    <aside className={`sidebar ${mobileOpen?"open":""}`}>
      <div className="brand">
  <img
    src="/meow-logo.png"
    alt="Meow Edits"
    style={{
      width: "46px",
      height: "46px",
      objectFit: "contain",
      borderRadius: "10px",
    }}
  />

  <div>
    <b>MEOW EDITS</b>
    <small>Xperia Nigeria</small>
  </div>

  <button
    className="close-mobile"
    onClick={() => setMobileOpen(false)}
  >
    <X />
  </button>
</div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={page===label?"active":""} onClick={()=>{setPage(label);setMobileOpen(false)}}><Icon size={19}/><span>{label}</span>{label==="Point of Sale"&&<em>{cartCount||""}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="online"><span/> System online</div><button onClick={handleLogout}><LogOut size={18}/> Sign out</button></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="menu" onClick={()=>setMobileOpen(true)}><Menu/></button>
        <div><p className="eyebrow">XPERIA NIGERIA</p><h1>{page}</h1></div>
        <div className="top-actions"><button className="icon-btn"><Bell size={19}/><i/></button><div className="avatar">
  {(profile?.full_name || "M").charAt(0).toUpperCase()}
</div>

<div className="user">
  <b>{profile?.full_name || "Meow Admin"}</b>
  <small>
    {profile?.role
      ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
      : "Owner"}
  </small>
</div></div>
      </header>

      {!isSupabaseConfigured && <div className="config-banner"><ShieldCheck size={18}/><div><b>Demo mode</b><span>Add your Supabase URL and anon key to <code>.env</code> to connect live data.</span></div></div>}

      {page === "Dashboard" && (
  <Dashboard
    products={products}
    money={money}
    onPOS={() => setPage("Point of Sale")}
    profile={profile}
  />
)}
      {page==="Point of Sale" && <POS products={filtered} query={query} setQuery={setQuery} category={category} setCategory={setCategory} add={add} cart={cart} adjust={adjust} total={cartTotal} count={cartCount} checkout={()=>setShowCheckout(true)} money={money}/>}
      {page==="Inventory" && <Inventory
  products={products}
  money={money}
  notify={notify}
  onAdd={() => {
    setEditingProduct(null);
    setShowProductForm(true);
  }}
onDelete={removeProduct}
  onEdit={(product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  }}
/>} 
      {page==="Sales" && <Sales money={money}/>}
      {page==="Reports" && <Reports money={money}/>}
      {page === "Audit Logs" && <AuditLogs notify={notify} />}
      {page==="Staff" && <Staff notify={notify}/>}
      {page==="Settings" && <Settings />}

      <footer>
  MEOW EDITS · Xperia Nigeria <span></span>{isSupabaseConfigured?"Connected":"Demo mode"}</footer>
    </main>

    {showCheckout && <Checkout total={cartTotal} cart={cart} money={money} close={()=>setShowCheckout(false)} complete={async (
  paymentMethod,
  amountPaid,
  discount,
  vat,
  finalTotal
) => {
  if (!supabase) {
    notify("Supabase is not configured.");
    return;
  }

  if (cart.length === 0) {
    notify("Cart is empty.");
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      notify("Your session has expired. Please sign in again.");
      return;
    }

    const receiptNumber = `MEOW-${Date.now()}`;

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        receipt_number: receiptNumber,
        cashier_id: user?.id ?? null,
        subtotal: cartTotal,
discount: discount,
total: finalTotal,
payment_method: paymentMethod,
amount_paid: amountPaid,
change_due: Math.max(0, amountPaid - finalTotal),
        notes: null
      })
      .select("id")
      .single();

    if (saleError) throw saleError;

    const saleItems = cart.map(item => ({
  sale_id: sale.id,
  product_id: item.id,
  quantity: item.quantity,
  unit_price: item.price
}));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);

    if (itemsError) throw itemsError;

    for (const item of cart) {
      const newStock = Math.max(0, item.stock - item.quantity);

      const { error: stockError } = await supabase.rpc(
  "decrease_stock",
  {
    p_sale_id: sale.id,
    p_product_id: item.id,
    p_quantity: item.quantity
  }
);

if (stockError) throw stockError;
    }

    setProducts(current =>
      current.map(product => {
        const sold = cart.find(item => item.id === product.id);

        return sold
          ? { ...product, stock: Math.max(0, product.stock - sold.quantity) }
          : product;
      })
    );

   setReceipt({
  receiptNumber,
  items: cart,
  subtotal: cartTotal,
  discount,
  vat,
  total: finalTotal,
  paymentMethod,
  amountPaid
});

setShowCheckout(false);
setCart([]);

    notify(`Sale completed successfully. Receipt ${receiptNumber} ready.`);
  } catch (error: any) {
    console.error("Checkout error:", error);
    notify(error?.message || "Could not complete sale.");
  }
}} />}
{showProductForm && <ProductForm
  supabase={supabase}
  close={() => {
    setShowProductForm(false);
    setEditingProduct(null);
  }}
  notify={notify}
  editingProduct={editingProduct}
  onSaved={(product) => {
    setProducts(current => {
      const exists = current.some(p => p.id === product.id);

      if (exists) {
        return current
          .map(p => p.id === product.id ? product : p)
          .sort((a, b) => a.name.localeCompare(b.name));
      }

      return [...current, product]
        .sort((a, b) => a.name.localeCompare(b.name));
    });

    setShowProductForm(false);
    setEditingProduct(null);
  }}
/>}
{receipt && (
  <div className="modal-backdrop receipt-backdrop">
    <div
      className="modal receipt-print"
      style={{
        maxWidth: 520,
        background: "#fff",
        color: "#172033"
      }}
    >      <div className="modal-head">
        <div>
          <span className="pill">RECEIPT</span>
          <h2>Meow Receipt</h2>
        </div>

        <button
          className="icon-btn"
          onClick={() => setReceipt(null)}
        >
          ×
        </button>
      </div>

      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <h2 style={{ margin: 0 }}>MEOW EDITS</h2>
        <div style={{ color: "#718096" }}>Xperia Nigeria</div>

        <div style={{ marginTop: 12, fontSize: 13 }}>
          Receipt: <strong>{receipt.receiptNumber}</strong>
        </div>

        <div style={{ color: "#718096", fontSize: 12 }}>
          {new Date().toLocaleString()}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb" }}>
        {receipt.items.map(item => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid #f0f2f5"
            }}
          >
            <div>
              <strong>{item.name}</strong>
              <div style={{ color: "#718096", fontSize: 13 }}>
                {item.quantity} × {money(item.price)}
              </div>
            </div>

            <strong>
              {money(item.price * item.quantity)}
            </strong>
          </div>
        ))}
      </div>

<div
  style={{
    borderTop: "1px solid #e5e7eb",
    paddingTop: "12px",
    fontSize: 13
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "6px"
    }}
  >
    <span>Payment</span>
    <strong>{receipt.paymentMethod?.toUpperCase() || "CASH"}</strong>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "6px"
    }}
  >
    <span>Amount paid</span>
    <span>{money(receipt.amountPaid ?? receipt.total)}</span>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between"
    }}
  >
    <span>Change</span>
    <span>
      {money(Math.max(0, (receipt.amountPaid ?? receipt.total) - receipt.total))}
    </span>
  </div>
</div>      
<div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
          fontWeight: 800,
          padding: "18px 0"
        }}
      >
        <span>TOTAL</span>
        <span>{money(receipt.total)}</span>
      </div>
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10px",
  }}
>
  <span>Subtotal</span>
  <span>{money(receipt.subtotal)}</span>
</div>

{receipt.discount > 0 && (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginTop: "8px",
    }}
  >
    <span>Discount (2%)</span>
    <span>-{money(receipt.discount)}</span>
  </div>
)}

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    marginTop: "8px",
  }}
>
  <span>VAT (7.5%)</span>
  <span>{money(receipt.vat)}</span>
</div>
      <div className="modal-actions">
        <button
          className="ghost"
          onClick={() => setReceipt(null)}
        >
          Done
        </button>

        <button
          className="primary"
          onClick={() => window.print()}
        >
          🖨️ Print Receipt
        </button>
      </div>
    </div>
  </div>
)}
    {toast && <div className="toast"><Sparkles size={17}/>{toast}</div>}
  </div>
}

function Dashboard({
  products,
  money,
  onPOS,
  profile,
}: {
  products: Product[];
  money: (n: number) => string;
  onPOS: () => void;
  profile: { full_name: string } | null;
}) {
  const [todaySales, setTodaySales] = useState(0);
const [todayTransactions, setTodayTransactions] = useState(0);
const [weeklySales, setWeeklySales] = useState<number[]>([
  0, 0, 0, 0, 0, 0, 0
]);

useEffect(() => {
  async function loadTodaySales() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("sales")
      .select("total, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Dashboard sales error:", error);
      return;
    }

    const now = new Date();

    const rows = (data ?? []).filter((sale) => {
      const d = new Date(sale.created_at);

      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    });

    setTodaySales(
      rows.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0
      )
    );

    setTodayTransactions(rows.length);
  }

  loadTodaySales();
}, []);
  const low = products.filter(
  p => p.stock <= (p.low_stock_threshold ?? 5)
).length;
  return <section className="content">
    <div className="welcome"><div><span className="pill">TODAY</span><h2>
  Good day, {profile?.full_name || "Meow Admin"} 👋
</h2><p>Here's what's happening in your shop.</p></div><button className="primary" onClick={onPOS}><ShoppingCart size={18}/> Open POS</button></div>
    <div className="stats">
      <Stat icon={CircleDollarSign} label="Today's sales" value={money(todaySales)} change="+12.8%" />
      <Stat icon={Receipt} label="Transactions" value={todayTransactions.toString()} change="+4 today" />
      <Stat icon={Boxes} label="Active products" value={products.length.toString()} change="Across 3 categories" />
      <Stat icon={Bell} label="Low stock" value={low.toString()} change={low?"Needs attention":"All good"} danger={!!low}/>
    </div>
    <div className="grid-2">
      <div className="panel"><div className="panel-head"><div><h3>Sales overview</h3><p>Last 7 days</p></div><button className="ghost">This week <ChevronRight size={15}/></button></div><div className="chart">
  <div className="bars">
    {[42, 62, 48, 74, 56, 88, 68].map((h, i) => (
      <div key={i} className="bar-col">
        <div
          className="bar"
          style={{ height: `${h}%` }}
        />
        <small>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
        </small>
      </div>
    ))}
  </div>
</div><div className="panel"><div className="panel-head"><div><h3>Low stock</h3><p>Products at or below threshold</p></div><button className="link">View inventory</button></div>{products
 .filter(p => p.stock <= (p.low_stock_threshold ?? 5))
.map(p => (
  <div className="stock-row" key={p.id}>
    <div className="product-dot">
      {p.name[0]}
    </div>

    <div>
      <b>{p.name}</b>
      <small>
        {p.category} · {p.sku}
      </small>
    </div>

    <strong className="danger-text">
      {p.stock} left
    </strong>
  </div>
))}
</div>
</div>
</div>
</section>
}
function Stat({icon:Icon,label,value,change,danger}:{icon:any;label:string;value:string;change:string;danger?:boolean}){return <div className="stat"><div className="stat-icon"><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small className={danger?"danger-text":""}>{change}</small></div>}

function POS({products,query,setQuery,category,setCategory,add,cart,adjust,total,count,checkout,money}:{products:Product[];query:string;setQuery:(v:string)=>void;category:string;setCategory:(v:string)=>void;add:(p:Product)=>void;cart:CartItem[];adjust:(id:string,d:number)=>void;total:number;count:number;checkout:()=>void;money:(n:number)=>string}) {
 return <section className="content pos-layout"><div className="pos-products"><div className="searchline"><div className="search"><Search size={18}/><input
  value={query}
  onChange={e => setQuery(e.target.value)}
  onKeyDown={e => {
    if (e.key !== "Enter") return;

    const scanned = query.trim().toLowerCase();

    if (!scanned) return;

    const product = products.find(
      p => p.sku?.trim().toLowerCase() === scanned
    );

    if (product) {
      add(product);
      setQuery("");
    }
  }}
  placeholder="Scan barcode or search products..."
  autoFocus
/></div><div className="categories">{["All","Beddings","Decor","Fragrances"].map(c=><button key={c} className={category===c?"selected":""} onClick={()=>setCategory(c)}>{c}</button>)}</div></div><div className="product-grid">{products.map(p=><button className="product-card" key={p.id} onClick={()=>add(p)}><div className="product-image">{p.image_url ? (
  <img
    src={p.image_url}
    alt={p.name}
    style={{
      width: "100%",
      height: "100%",
      objectFit: "cover",
    }}
  />
) : (
  <PackagePlus size={30} />
)}<span className={p.stock<=5?"low":""}>{p.stock} in stock</span></div><div className="product-info"><small>{p.category}</small><b>{p.name}</b><strong>{money(p.price)}</strong></div></button>)}</div></div>
 <aside className="cart"><div className="cart-head"><div><h3>Current sale</h3><span>{count} item{count===1?"":"s"}</span></div><ShoppingCart/></div>{cart.length===0?<div className="empty"><ShoppingCart size={34}/><b>Your cart is empty</b><span>Add products to start a sale.</span></div>:<div className="cart-items">{cart.map(i=><div className="cart-item" key={i.id}><div className="mini">{i.name[0]}</div><div className="ci-main"><b>{i.name}</b><small>{money(i.price)} each</small><div className="qty">
  <button onClick={() => adjust(i.id, -1)}>
    <Minus size={13} />
  </button>

  <b>{i.quantity}</b>

  <button onClick={() => adjust(i.id, 1)}>
    <Plus size={13} />
  </button>

<button
  type="button"
  onClick={() => adjust(i.id, -i.quantity)}
  title="Remove from cart"
  style={{
    marginLeft: 8,
    color: "#c53030"
  }}
>
  ×
</button>
</div></div><strong>{money(i.price*i.quantity)}</strong></div>)}</div>}<div className="cart-bottom"><div><span>Subtotal</span><b>{money(total)}</b></div><div><span>Discount</span><b>₦0</b></div><div className="grand"><span>Total</span><strong>{money(total)}</strong></div><button className="primary wide" disabled={!cart.length} onClick={checkout}>Checkout <ChevronRight size={18}/></button></div></aside></section>
}

function Inventory({
  products,
  money,
  notify,
  onAdd,
  onEdit,
  onDelete,
}: {
  products: Product[];
  money: (n: number) => string;
  notify: (s: string) => void;
  onAdd: () => void;
  onEdit: (product: Product) => void;
onDelete: (product: Product) => void;
}) {
  const [search,setSearch]=useState("");
  const visible=products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );
const printBarcode = (product: Product) => {
 const printWindow = window.open(
  "",
  "_blank",
  "width=1000,height=800,left=100,top=50"
);
  if (!printWindow) {
    notify("Please allow pop-ups to print barcodes.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${product.name} - ${product.sku}</title>

      <style>
        @page {
  size: 38.1mm 25.4mm;
  margin: 0;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 38.1mm;
  height: 25.4mm;
  overflow: hidden;
  text-align: center;
}

.label {
  width: 38.1mm;
  height: 25.4mm;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  page-break-after: avoid;
  break-after: avoid;
  position: relative;
}

.label-content {
  width: 25.4mm;
  height: 38.1mm;
  margin: 0;
  padding: 1.5mm 2mm;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  text-align: center;

  position: absolute;
  left: 50%;
  top: 35%;

  transform: translate(-50%, -50%) rotate(-90deg);
}.brand {
  font-size: 8px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1mm;
}

.product {
  font-size: 9px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 0.5mm;
}

.category {
  font-size: 7px;
  line-height: 1;
  margin-bottom: 1mm;
}

#barcode {
  display: block;
  width: 34mm;
  height: auto;
  margin: 0 auto;
}

.price {
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  margin-top: 0.5mm;
}

        @media print {
  html,
  body {
    width: 38.1mm;
    height: 25.4mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .label {
    width: 38.1mm;
    height: 25.4mm;
    margin: 0;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-after: avoid;
    break-inside: avoid;
  }
}
      </style>
    </head>

    <body>
      <div class="label">
  <div class="label-content">

    <div class="brand">MEOW EDITS</div>

    <div class="product">${product.name}</div>

    <div class="category">${product.category}</div>

    <svg id="barcode"></svg>

    <div class="price">
      ₦${Number(product.price).toLocaleString()}
    </div>

  </div>
</div>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

      <script>
        window.onload = function () {
          JsBarcode("#barcode", "${product.sku}", {
  format: "CODE128",
  width: 2,
  height: 45,
  displayValue: true,
  fontSize: 9,
  margin: 4,
  marginTop: 3,
  marginBottom: 3
});

          setTimeout(function () {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
};


  return <section className="content">
    <div className="page-head">
      <div><h2>Inventory</h2><p>Manage products, prices and stock.</p></div>
      <button className="primary" onClick={onAdd}><Plus size={18}/> Add product</button>
    </div>
    <div className="table-panel">
      <div className="table-tools">
        <div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inventory..." /></div>
        <button className="ghost" onClick={()=>notify("Inventory is synced from Supabase.")}><RefreshCw size={16}/> Sync</button>
      </div>
      <div className="table-wrap"><table><thead>
  <tr>
    <th>Product</th>
    <th>Category</th>
    <th>SKU</th>
    <th>Barcode</th>
    <th>Price</th>
    <th>Stock</th>
    <th>Status</th>
    <th>Label</th>
<th>Actions</th>
  </tr>
</thead>
      <tbody>
  {visible.length === 0 ? (
    <tr>
      <td
        colSpan={9}
        style={{ textAlign: "center", padding: "32px" }}
      >
        No products yet. Click <b>Add product</b> to create the first live product.
      </td>
    </tr>
  ) : (
    visible.map((p) => (
      <tr key={p.id}>
        <td>
          <div className="table-product">
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                style={{
                  width: 38,
                  height: 38,
                  objectFit: "cover",
                  borderRadius: 10,
                }}
              />
            ) : (
              <div className="mini">
                {p.name[0]}
              </div>
            )}

            <b>{p.name}</b>
          </div>
        </td>

        <td>{p.category}</td>
        <td>{p.sku}</td>

        <td>
          {p.sku ? (
            <Barcode
              value={p.sku}
              width={1.2}
              height={35}
              displayValue={true}
              fontSize={10}
              margin={0}
            />
          ) : (
            <span>No SKU</span>
          )}
        </td>

        <td>{money(p.price)}</td>
        <td>{p.stock}</td>

        <td>
          <span className={`status ${p.stock <= 5 ? "warn" : ""}`}>
            {p.stock <= 5 ? "Low stock" : "In stock"}
          </span>
        </td>

        <td>
          <button
            className="ghost"
            onClick={() => printBarcode(p)}
          >
            🖨️ Print
          </button>
        </td>
<td>
  <button
    className="ghost"
    onClick={() => onEdit(p)}
  >
    ✏️ Edit
  </button>
<button
  className="ghost"
  onClick={() => onDelete(p)}
  style={{
    color: "#c53030",
    marginLeft: 8
  }}
>
  🗑️ Delete
</button>
</td>
      </tr>
    ))
  )}
</tbody></table></div>
    </div>
  </section>
}

function ProductForm({
  supabase,
  close,
  notify,
  onSaved,
  editingProduct,
}: {
  supabase: any;
  close: () => void;
  notify: (s: string) => void;
  onSaved: (p: Product) => void;
  editingProduct?: Product | null;
}) {
  const [categories,setCategories]=useState<{id:string;name:string}[]>([]);
 const [form, setForm] = useState({
  name: "",
  category_id: "",
  sku: "",
  description: "",
  cost_price: "",
  selling_price: "",
  stock_quantity: "",
  low_stock_threshold: "5",
  image_url: ""
});
const [uploadingImage, setUploadingImage] = useState(false);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
  if (!editingProduct) return;

  setForm({
    name: editingProduct.name ?? "",
    category_id: editingProduct.category ?? "",
    sku: editingProduct.sku ?? "",
    description: "",
    cost_price: "",
    selling_price: String(editingProduct.price ?? ""),
    stock_quantity: String(editingProduct.stock ?? ""),
    low_stock_threshold: "5",
    image_url: editingProduct.image_url ?? ""
  });
}, [editingProduct]);
    useEffect(() => {
  if (!supabase) return;

  supabase
    .from("categories")
    .select("id,name")
    .order("name")
    .then(({ data, error }: { data: any[] | null; error: any }) => {
      if (error) {
        console.error(error);
        notify("Could not load categories.");
        return;
      }

      setCategories(data ?? []);
    });
}, [supabase]);

  const update=(key:string,value:string)=>setForm(f=>({...f,[key]:value}));

  const save = async () => {
  if (!supabase) {
    return notify("Supabase is not configured.");
  }

  if (
    !form.name.trim() ||
    !form.category_id ||
    !form.selling_price
  ) {
    notify("Name, category and selling price are required.");
    return;
  }

  setSaving(true);

  try {
    const selectedCategory = categories.find(
      c =>
        c.id === form.category_id ||
        c.name.toLowerCase() === form.category_id.toLowerCase()
    );

    if (!selectedCategory) {
      setSaving(false);
      notify("Please select a valid category.");
      return;
    }

    const productData = {
      category_id: selectedCategory.id,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      cost_price: Number(form.cost_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      stock_quantity: Number(form.stock_quantity) || 0,
      low_stock_threshold:
        Number(form.low_stock_threshold) || 0,
      is_active: true
    };

    let data;
    let error;

    if (editingProduct) {
      // EDIT EXISTING PRODUCT
      const result = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id)
        .select(`
          id,
          sku,
          name,
          description,
          image_url,
          cost_price,
          selling_price,
          stock_quantity,
          low_stock_threshold,
          is_active,
          categories(id,name)
        `)
        .single();

      data = result.data;
      error = result.error;
    } else {
      // ADD NEW PRODUCT
      const result = await supabase
        .from("products")
        .insert(productData)
        .select(`
          id,
          sku,
          name,
          description,
          image_url,
          cost_price,
          selling_price,
          stock_quantity,
          low_stock_threshold,
          is_active,
          categories(id,name)
        `)
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Product save error:", error);
      notify(error.message || "Could not save product.");
      return;
    }

    onSaved({
      id: data.id,
      name: data.name,
      category: data.categories?.name ?? "",
      price: Number(data.selling_price),
      stock: Number(data.stock_quantity),
      sku: data.sku ?? "",
      image_url: data.image_url ?? undefined,
      active: data.is_active
    });

    notify(
      editingProduct
        ? "Product updated successfully."
        : "Product added to live inventory."
    );

  } catch (error: any) {
    console.error("Product save error:", error);
    notify(error?.message || "Could not save product.");
  } finally {
    setSaving(false);
  }
};

  return <div className="modal-backdrop"><div className="modal" style={{maxWidth:720}}>
    <div className="modal-head"><div><span className="pill">INVENTORY</span><h2>Add product</h2></div><button className="icon-btn" onClick={close}><X/></button></div>
    <div className="settings-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
      <label>Product name<input value={form.name} onChange={e=>update("name",e.target.value)} placeholder="e.g. Luxury King Beddings"/></label>
      <label>Category<select value={form.category_id} onChange={e=>update("category_id",e.target.value)}><option value="">Select category</option>
{categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option> ))}</select></label>
      <label>SKU / Barcode<input value={form.sku} onChange={e=>update("sku",e.target.value)} placeholder="Scan or enter barcode"/></label>
      <label>
  Product image
  <input
    type="file"
    accept="image/*"
    disabled={uploadingImage}
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file || !supabase) return;

      setUploadingImage(true);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        update("image_url", data.publicUrl);

        notify("Product image uploaded.");
      } catch (error: any) {
        console.error("Image upload error:", error);
        notify(error?.message || "Could not upload image.");
      } finally {
        setUploadingImage(false);
      }
    }}
  />

  {uploadingImage && <small>Uploading image...</small>}

  {form.image_url && (
    <img
      src={form.image_url}
      alt="Product preview"
      style={{
        width: 80,
        height: 80,
        objectFit: "cover",
        borderRadius: 10,
        marginTop: 8,
      }}
    />
  )}
</label>
      <label>Cost price<input value={form.cost_price} onChange={e=>update("cost_price",e.target.value)} inputMode="decimal" placeholder="0"/></label>
      <label>Selling price<input value={form.selling_price} onChange={e=>update("selling_price",e.target.value)} inputMode="decimal" placeholder="0"/></label>
      <label>Opening stock<input value={form.stock_quantity} onChange={e=>update("stock_quantity",e.target.value)} inputMode="numeric" placeholder="0"/></label>
      <label>Low-stock threshold<input value={form.low_stock_threshold} onChange={e=>update("low_stock_threshold",e.target.value)} inputMode="numeric" placeholder="5"/></label>
      <label style={{gridColumn:"1 / -1"}}>Description<input value={form.description} onChange={e=>update("description",e.target.value)} placeholder="Optional product description"/></label>
    </div>
    <div className="modal-actions"><button className="ghost" onClick={close}>Cancel</button><button className="primary" disabled={saving} onClick={save}>{saving?"Saving...":"Save product"} <PackagePlus size={17}/></button></div>
  </div></div>
}

function Sales({money}:{money:(n:number)=>string}) {
  const [sales, setSales] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [selectedSale, setSelectedSale] = useState<any | null>(null);
const [saleItems, setSaleItems] = useState<any[]>([]);
const [itemsLoading, setItemsLoading] = useState(false);
const [salesSearch, setSalesSearch] = useState("");

  useEffect(() => {
    async function loadSales() {
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("sales")
        .select(`
  id,
  receipt_number,
  cashier_id,
  subtotal,
  discount,
  total,
  payment_method,
  amount_paid,
  change_due,
  notes,
  created_at,
  profiles:cashier_id (
    full_name
  )
`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Sales load error:", error);
        setError(error.message);
      } else {
        setSales(data ?? []);
      }

      setLoading(false);
    }

    loadSales();
  }, []);
async function openReceipt(sale: any) {
  if (!supabase) return;

  setSelectedSale(sale);
  setSaleItems([]);
  setItemsLoading(true);

  const { data, error } = await supabase
    .from("sale_items")
    .select(`
      quantity,
      unit_price,
      products (
        name,
        sku,
        categories (
          name
        )
      )
    `)
    .eq("sale_id", sale.id);

 if (error) {
  console.error("Receipt items error:", error);
  setError(`Could not load receipt details: ${error.message}`);
} else {
  setSaleItems(data ?? []);
}

  setItemsLoading(false);
}

const filteredSales = sales.filter((sale) => {
  const search = salesSearch.trim().toLowerCase();

  if (!search) return true;

  const receipt = String(sale.receipt_number ?? "").toLowerCase();
  const cashier = String(
    sale.profiles?.full_name ?? ""
  ).toLowerCase();
  const payment = String(
    sale.payment_method ?? ""
  ).toLowerCase();

  return (
    receipt.includes(search) ||
    cashier.includes(search) ||
    payment.includes(search)
  );
});  
return (
    <section className="content">
      <div className="page-head">
        <div>
          <h2>Sales history</h2>
          <p>Every completed transaction in one place.</p>
        </div>

        <button className="ghost">
          <FileText size={17}/> Export
        </button>
      </div>

      <div className="table-panel">
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 20px",
    borderBottom: "1px solid #edf0f5",
  }}
>
  <Search size={17} />

  <input
    value={salesSearch}
    onChange={(e) => setSalesSearch(e.target.value)}
    placeholder="Search receipt, cashier or payment..."
    style={{
      width: "100%",
      border: "none",
      outline: "none",
      background: "transparent",
      fontSize: 14,
      color: "#172033",
    }}
  />
</div>
        {loading ? (
          <div style={{padding: 30, textAlign: "center"}}>
            Loading sales...
          </div>
        ) : error ? (
          <div style={{
            padding: 20,
            color: "#b42318",
            background: "#fff1f2",
            borderRadius: 12
          }}>
            Could not load sales: {error}
          </div>
        ) : sales.length === 0 ? (
          <div style={{padding: 30, textAlign: "center"}}>
            No sales have been recorded yet.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Cashier</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale.id}>
                  <td>
  <button
    className="ghost"
    onClick={() => openReceipt(sale)}
    style={{
      padding: 0,
      border: "none",
      background: "transparent",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {sale.receipt_number}
  </button>
</td>

                  <td>
                    {new Date(sale.created_at).toLocaleString()}
                  </td>

                  <td>
                    {sale.profiles?.full_name || "Unknown"}
                  </td>

                  <td>
                    {sale.payment_method || "—"}
                  </td>

                  <td>
                    {money(Number(sale.total) || 0)}
                  </td>

                  <td>
                    <span className="status">
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
{selectedSale && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.45)",
      display: "grid",
      placeItems: "center",
      padding: 20,
      zIndex: 1000,
    }}
    onClick={() => setSelectedSale(null)}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: 20,
        padding: 28,
        boxShadow: "0 24px 70px rgba(15,23,42,.25)",
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: 700,
              color: "#718096",
            }}
          >
            MEOW EDITS
          </div>

          <h2 style={{ margin: "6px 0" }}>Receipt</h2>

          <b>{selectedSale.receipt_number}</b>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
  <button
    className="primary"
    onClick={() => {
      const printWindow = window.open("", "_blank", "width=420,height=700");

      if (!printWindow) {
        setError("Could not open the print window. Please allow pop-ups.");
        return;
      }

      const itemsHtml = saleItems
        .map((item) => {
          const product = Array.isArray(item.products)
            ? item.products[0]
            : item.products;

          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unit_price) || 0;
          const lineTotal = quantity * unitPrice;

          return `
            <tr>
              <td>
                ${product?.name || "Unknown product"}
                <br>
                <small>${quantity} × ${money(unitPrice)}</small>
              </td>
              <td style="text-align:right;">
                ${money(lineTotal)}
              </td>
            </tr>
          `;
        })
        .join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${selectedSale.receipt_number}</title>

<style>
  @page {
    size: 80mm auto;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    width: 80mm !important;
    background: #fff;
    color: #172033;
    font-family: Arial, Helvetica, sans-serif;
  }

  body {
    font-size: 12px;
  }

  .receipt {
    width: 80mm !important;
    max-width: 80mm !important;
    margin: 0 !important;
    padding: 4mm !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .brand {
    text-align: center;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 2px;
    margin-bottom: 2px;
  }

  .company {
    text-align: center;
    font-size: 10px;
    margin-bottom: 4mm;
  }

  .receipt-number {
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .date {
    text-align: center;
    font-size: 10px;
    margin-bottom: 3mm;
  }

  .meta {
    border-top: 1px solid #222;
    border-bottom: 1px solid #222;
    padding: 2mm 0;
    margin-bottom: 3mm;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin: 1mm 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  td {
    padding: 2mm 0;
    vertical-align: top;
    border-bottom: 1px dashed #aaa;
  }

  td:last-child {
    text-align: right;
    white-space: nowrap;
    font-weight: 700;
  }

  small {
    font-size: 9px;
  }

  .total {
    display: flex;
    justify-content: space-between;
    border-top: 2px solid #172033;
    margin-top: 3mm;
    padding-top: 3mm;
    font-size: 17px;
    font-weight: 800;
  }

  .payment {
    margin-top: 3mm;
  }

  .payment-row {
    display: flex;
    justify-content: space-between;
    margin: 1.5mm 0;
  }

  .thanks {
    text-align: center;
    margin-top: 5mm;
    font-size: 10px;
  }

  @media print {
    html,
    body {
      width: 80mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .receipt {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 4mm !important;
    }
  }
</style>
        </head>

        <body>
          <div class="receipt">

            <div class="brand">MEOW EDITS</div>
            <div class="company">XPERIA NIGERIA</div>

            <div class="receipt-number">
              ${selectedSale.receipt_number}
            </div>

            <div class="date">
              ${new Date(selectedSale.created_at).toLocaleString()}
            </div>

            <div class="meta">
              <div class="meta-row">
                <span>Cashier</span>
                <strong>
                  ${selectedSale.profiles?.full_name || "Unknown"}
                </strong>
              </div>

              <div class="meta-row">
                <span>Payment</span>
                <strong>
                  ${selectedSale.payment_method || "—"}
                </strong>
              </div>

              <div class="meta-row">
                <span>Status</span>
                <strong>Completed</strong>
              </div>
            </div>

            <table>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="margin-top: 10px;">

  <div style="
    display:flex;
    justify-content:space-between;
    margin:6px 0;
  ">
    <span>Subtotal</span>
    <span>
      ${money(Number(selectedSale.subtotal) || 0)}
    </span>
  </div>

  ${
    Number(selectedSale.discount) > 0
      ? `
        <div style="
          display:flex;
          justify-content:space-between;
          margin:6px 0;
        ">
          <span>Discount (2%)</span>
          <span>
            -${money(Number(selectedSale.discount) || 0)}
          </span>
        </div>
      `
      : ""
  }

  <div style="
    display:flex;
    justify-content:space-between;
    margin:6px 0;
  ">
    <span>VAT (7.5%)</span>
    <span>
      ${money(
        Math.max(
          0,
          Number(selectedSale.total || 0) -
            (
              Number(selectedSale.subtotal || 0) -
              Number(selectedSale.discount || 0)
            )
        )
      )}
    </span>
  </div>

</div>

<div class="total">
  <span>TOTAL</span>
  <span>
    ${money(Number(selectedSale.total) || 0)}
  </span>
</div>

            <div class="payment">

              <div class="payment-row">
                <span>Amount paid</span>
                <strong>
                  ${money(Number(selectedSale.amount_paid) || 0)}
                </strong>
              </div>

              <div class="payment-row">
                <span>Change</span>
                <strong>
                  ${money(Number(selectedSale.change_due) || 0)}
                </strong>
              </div>

            </div>

            <div class="thanks">
              Thank you for shopping with Meow Edits.
            </div>

          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 300);
            };
          </script>

        </body>
        </html>
      `);

      printWindow.document.close();
    }}
  >
    🖨️ Reprint
  </button>

  <button
    className="ghost"
    onClick={() => setSelectedSale(null)}
  >
    Close
  </button>
</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <small>Date</small>
          <div>
            {new Date(selectedSale.created_at).toLocaleString()}
          </div>
        </div>

        <div>
          <small>Cashier</small>
          <div>
            {selectedSale.profiles?.full_name || "Unknown"}
          </div>
        </div>

        <div>
          <small>Payment</small>
          <div>
            {selectedSale.payment_method || "—"}
          </div>
        </div>

        <div>
          <small>Status</small>
          <div>
            <span className="status">Completed</span>
          </div>
        </div>
      </div>

      <hr />

      <h3 style={{ marginTop: 20 }}>Items</h3>

      {itemsLoading ? (
        <div style={{ padding: 20, textAlign: "center" }}>
          Loading receipt...
        </div>
      ) : saleItems.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center" }}>
          No items found for this receipt.
        </div>
      ) : (
        <div>
          {saleItems.map((item, index) => {
            const product = Array.isArray(item.products)
              ? item.products[0]
              : item.products;

            const lineTotal =
              Number(item.quantity || 0) *
              Number(item.unit_price || 0);

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid #edf0f5",
                }}
              >
                <div>
                  <b>{product?.name || "Unknown product"}</b>

                  <div style={{ fontSize: 12, color: "#718096" }}>
                    {item.quantity} ×{" "}
                    {money(Number(item.unit_price) || 0)}
                  </div>
                </div>

                <b>{money(lineTotal)}</b>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
    }}
  >
    <span>Subtotal</span>
    <span>
      {money(Number(selectedSale.subtotal) || 0)}
    </span>
  </div>

  {Number(selectedSale.discount) > 0 && (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 8,
        color: "#b42318",
      }}
    >
      <span>Discount (2%)</span>
      <span>
        -{money(Number(selectedSale.discount) || 0)}
      </span>
    </div>
  )}

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginTop: 8,
    }}
  >
    <span>VAT (7.5%)</span>
    <span>
      {money(
        Math.max(
          0,
          Number(selectedSale.total || 0) -
            (
              Number(selectedSale.subtotal || 0) -
              Number(selectedSale.discount || 0)
            )
        )
      )}
    </span>
  </div>
</div>

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    fontSize: 20,
    fontWeight: 800,
    padding: "18px 0",
  }}
>
  <span>TOTAL</span>
  <span>{money(Number(selectedSale.total) || 0)}</span>
</div>

      {selectedSale.amount_paid != null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Amount paid</span>
            <b>{money(Number(selectedSale.amount_paid) || 0)}</b>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <span>Change</span>
            <b>{money(Number(selectedSale.change_due) || 0)}</b>
          </div>
        </div>
      )}
    </div>
  </div>
)}
    </section>
  );
}
function Reports({money}:{money:(n:number)=>string}) {
  const [grossSales, setGrossSales] = useState(0);
  const [orders, setOrders] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [categoryMix, setCategoryMix] = useState([
  ["Beddings", 0],
  ["Decor", 0],
  ["Fragrances", 0],
]);
const [paymentMix, setPaymentMix] = useState<
  [string, number][]
>([]);
const [bestSellers, setBestSellers] = useState<
  { name: string; quantity: number; revenue: number }[]
>([]);

  useEffect(() => {
    async function loadGrossSales() {
      if (!supabase) return;

      const now = new Date();

      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

      const { data, error } = await supabase
  .from("sales")
  .select("id, total, created_at, payment_method")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

      if (error) {
        console.error("Reports sales error:", error);
        return;
      }

      const sales = data ?? [];

const total = sales.reduce(
  (sum, sale) => sum + Number(sale.total || 0),
  0
);

setGrossSales(total);
setOrders(sales.length);
const saleIds = sales.map(sale => sale.id);
const paymentTotals: Record<string, number> = {};

sales.forEach(sale => {
  const method = String(
    sale.payment_method || "unknown"
  );

  paymentTotals[method] =
    (paymentTotals[method] || 0) +
    Number(sale.total || 0);
});

const paymentTotal = Object.values(paymentTotals).reduce(
  (sum, value) => sum + value,
  0
);

if (paymentTotal > 0) {
  setPaymentMix(
    Object.entries(paymentTotals).map(
      ([method, value]) => [
        method,
        Math.round((value / paymentTotal) * 100)
      ]
    )
  );
}
if (saleIds.length > 0) {
  const { data: items, error: itemsError } = await supabase
  .from("sale_items")
  .select(`
    quantity,
    unit_price,
    products(
     name,
      categories(name)
    )
  `)
  .in("sale_id", saleIds);

  if (itemsError) {
    console.error("Reports category error:", itemsError);
  } else {
    const totals: Record<string, number> = {
      Beddings: 0,
      Decor: 0,
      Fragrances: 0,
    };

    (items ?? []).forEach(item => {
      const product = Array.isArray(item.products)
  ? item.products[0]
  : item.products;

const category = Array.isArray(product?.categories)
  ? (product.categories[0] as any)?.name
  : (product?.categories as any)?.name;

      if (category && totals[category] !== undefined) {
        totals[category] +=
          Number(item.quantity || 0) *
          Number(item.unit_price || 0);
      }
    });

    const totalCategorySales =
      totals.Beddings +
      totals.Decor +
      totals.Fragrances;

    if (totalCategorySales > 0) {
      setCategoryMix([
        [
          "Beddings",
          Math.round((totals.Beddings / totalCategorySales) * 100),
        ],
        [
          "Decor",
          Math.round((totals.Decor / totalCategorySales) * 100),
        ],
        [
          "Fragrances",
          Math.round((totals.Fragrances / totalCategorySales) * 100),
        ],
      ]);
    }
const productTotals: Record<
  string,
  { quantity: number; revenue: number }
> = {};

for (const item of items ?? []) {
  const product = Array.isArray(item.products)
    ? item.products[0]
    : item.products;

  const name = product?.name ?? "Unknown product";

  if (!productTotals[name]) {
    productTotals[name] = {
      quantity: 0,
      revenue: 0
    };
  }

  productTotals[name].quantity += Number(
    item.quantity ?? 0
  );

  productTotals[name].revenue +=
    Number(item.quantity ?? 0) *
    Number(item.unit_price ?? 0);
}

const sortedBestSellers = Object.entries(productTotals)
  .map(([name, values]) => ({
    name,
    quantity: values.quantity,
    revenue: values.revenue
  }))
  .sort((a, b) => {
    if (b.quantity !== a.quantity) {
      return b.quantity - a.quantity;
    }

    return b.revenue - a.revenue;
  })
  .slice(0, 5);

setBestSellers(sortedBestSellers);
 }
}
const { data: productsData, error: productsError } = await supabase
  .from("products")
  .select("selling_price, stock_quantity");

if (productsError) {
  console.error("Reports stock error:", productsError);
  return;
}

const value = (productsData ?? []).reduce(
  (sum, product) =>
    sum +
    Number(product.selling_price || 0) *
    Number(product.stock_quantity || 0),
  0
);

setStockValue(value);
    }

    loadGrossSales();
  }, []);

  return (
    <section className="content">
      <div className="page-head">
        <div>
          <h2>Reports</h2>
          <p>Understand sales and inventory performance.</p>
        </div>
      </div>

      <div className="stats">
        <Stat
          icon={CircleDollarSign}
          label="Gross sales"
          value={money(grossSales)}
          change="This month"
        />

       <Stat
  icon={ShoppingCart}
  label="Orders"
  value={orders.toString()}
  change="This month"
/>

        <Stat
  icon={BarChart3}
  label="Average order"
  value={money(orders > 0 ? grossSales / orders : 0)}
  change="Per transaction"
/>

        <Stat
          icon={Boxes}
          label="Stock value"
          value={money(stockValue)}
          change="At selling price"
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Category performance</h3>
            <p>Sales mix this month</p>
          </div>
        </div>

        {categoryMix.map(([n, v]) => (
          <div className="progress-row" key={n}>
            <span>{n}</span>
            <div className="progress">
              <i style={{width:`${v}%`}}></i>
            </div>
            <b>{v}%</b>
          </div>
        ))}
      </div>
<div className="panel">
  <div className="panel-head">
    <div>
      <h3>Payment methods</h3>
      <p>How customers paid this month</p>
    </div>
  </div>

  {paymentMix.length === 0 ? (
    <p style={{ color: "#718096" }}>
      No payment data yet.
    </p>
  ) : (
    paymentMix.map(([method, percentage]) => (
      <div
        className="progress-row"
        key={method}
      >
        <span>
          {method.charAt(0).toUpperCase() +
            method.slice(1)}
        </span>

        <div className="progress">
          <i
            style={{
              width: `${percentage}%`
            }}
          ></i>
        </div>

        <b>{percentage}%</b>
      </div>
    ))
  )}
</div>
<div className="panel">
  <div className="panel-head">
    <div>
      <h3>Best-selling products</h3>
      <p>Top products by units sold this month</p>
    </div>
  </div>

  {bestSellers.length === 0 ? (
    <p style={{ color: "#718096" }}>
      No product sales yet.
    </p>
  ) : (
    bestSellers.map((product, index) => (
      <div
        key={product.name}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "15px 0",
          borderBottom:
            index === bestSellers.length - 1
              ? "none"
              : "1px solid #edf0f4"
        }}
      >
        <div>
          <strong>
            {index + 1}. {product.name}
          </strong>

          <p
            style={{
              margin: "5px 0 0",
              color: "#718096",
              fontSize: 13
            }}
          >
            {product.quantity}{" "}
            {product.quantity === 1
              ? "unit"
              : "units"}{" "}
            sold
          </p>
        </div>

        <strong>
          {money(product.revenue)}
        </strong>
      </div>
    ))
  )}
</div>
    </section>
  );
}

function AuditLogs({ notify }: { notify: (s: string) => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    if (!supabase) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        "id,user_id,action,entity_type,entity_id,details,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Audit logs load error:", error);
      notify("Could not load audit logs.");
      setLoading(false);
      return;
    }

    const userIds = [
      ...new Set(
        (data ?? [])
          .map(log => log.user_id)
          .filter(Boolean)
      )
    ];

    let profiles: any[] = [];

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,full_name,role")
        .in("id", userIds);

      profiles = profileData ?? [];
    }

    const profileMap = new Map(
      profiles.map(profile => [profile.id, profile])
    );

    const formatted = (data ?? [])
      .map(log => ({
        ...log,
        user: profileMap.get(log.user_id)
      }))
      // Hide individual sale-item records.
      // The main sale record is much more useful to the user.
      .filter(log => log.entity_type !== "sale_items");

    setLogs(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getSaleInfo = (log: any) => {
    const item = log.details?.new;

    return {
      total: item?.total,
      receipt: item?.receipt_number,
      payment: item?.payment_method
    };
  };

  const getProductInfo = (log: any) => {
    const oldProduct = log.details?.old;
    const newProduct = log.details?.new;

    return {
      name:
        newProduct?.name ||
        oldProduct?.name ||
        "Unknown product",

      oldStock: oldProduct?.stock_quantity,
      newStock: newProduct?.stock_quantity
    };
  };

  const getActivity = (log: any) => {
    if (
      log.entity_type === "sales" &&
      log.action === "created"
    ) {
      return {
        icon: "₦",
        title: "Sale completed",
        description: "A new sale was completed.",
        type: "sale"
      };
    }

    if (
      log.entity_type === "products" &&
      log.action === "updated"
    ) {
      const product = getProductInfo(log);

      if (
        product.oldStock !== undefined &&
        product.newStock !== undefined &&
        product.oldStock !== product.newStock
      ) {
        return {
          icon: "📦",
          title: "Stock updated",
          description: product.name,
          type: "stock"
        };
      }

      return {
        icon: "✏️",
        title: "Product updated",
        description: product.name,
        type: "product"
      };
    }

    if (
      log.entity_type === "products" &&
      log.action === "created"
    ) {
      const product = getProductInfo(log);

      return {
        icon: "＋",
        title: "Product added",
        description: product.name,
        type: "product"
      };
    }

    if (
      log.entity_type === "products" &&
      log.action === "deleted"
    ) {
      return {
        icon: "−",
        title: "Product deleted",
        description: "A product was removed.",
        type: "product"
      };
    }

    if (log.entity_type === "profiles") {
      if (log.action === "created") {
        return {
          icon: "👤",
          title: "Staff profile created",
          description:
            log.details?.new?.full_name ||
            "New staff member",
          type: "staff"
        };
      }

      if (log.action === "updated") {
        return {
          icon: "👤",
          title: "Staff profile updated",
          description:
            log.details?.new?.full_name ||
            "Staff member",
          type: "staff"
        };
      }

      if (log.action === "deleted") {
        return {
          icon: "👤",
          title: "Staff profile deleted",
          description: "A staff profile was removed.",
          type: "staff"
        };
      }
    }

    return {
      icon: "•",
      title:
        log.action.charAt(0).toUpperCase() +
        log.action.slice(1) +
        " " +
        log.entity_type.replace(/_/g, " "),
      description: "System activity",
      type: "other"
    };
  };

  const filteredLogs = logs.filter(log => {
    const activity = getActivity(log);
    const staffName =
      log.user?.full_name || "Unknown user";

    const text = `
      ${staffName}
      ${activity.title}
      ${activity.description}
      ${log.entity_type}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const moneyValue = (value: any) => {
    if (value === undefined || value === null) return "";

    return `₦${Number(value).toLocaleString()}`;
  };

  return (
    <section className="content">
      <div
        className="page-head"
        style={{
          alignItems: "center"
        }}
      >
        <div>
          <h2>Audit Logs</h2>
          <p>
            Track important activity across Meow.
          </p>
        </div>

        <button
          className="primary"
          onClick={loadLogs}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div
        className="panel"
        style={{
          marginBottom: 18
        }}
      >
        <input
          type="text"
          placeholder="Search activity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px 15px",
            border: "1px solid #dfe3e9",
            borderRadius: 10,
            fontSize: 14,
            outline: "none"
          }}
        />
      </div>

      <div className="panel">
        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign: "center"
            }}
          >
            <p>Loading audit activity...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center"
            }}
          >
            <div
              style={{
                fontSize: 32,
                marginBottom: 10
              }}
            >
              🔎
            </div>

            <strong>No activity found</strong>

            <p
              style={{
                color: "#718096",
                marginTop: 6
              }}
            >
              Try a different search.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 0
            }}
          >
            {filteredLogs.map(log => {
              const activity = getActivity(log);
              const sale = getSaleInfo(log);
              const product = getProductInfo(log);

              return (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    gap: 15,
                    padding: "18px 8px",
                    borderBottom:
                      "1px solid #edf0f4",
                    alignItems: "flex-start"
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      minWidth: 42,
                      borderRadius: 12,
                      background: "#f3f5f8",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 18
                    }}
                  >
                    {activity.icon}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 15
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            fontSize: 15
                          }}
                        >
                          {activity.title}
                        </strong>

                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#718096",
                            fontSize: 13
                          }}
                        >
                          {activity.description}
                        </p>
                      </div>

                      <span
                        style={{
                          color: "#718096",
                          fontSize: 12,
                          whiteSpace: "nowrap"
                        }}
                      >
                        {new Date(
                          log.created_at
                        ).toLocaleString()}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 9,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center"
                      }}
                    >
                      <span
                        style={{
                          background: "#f3f5f8",
                          padding: "5px 9px",
                          borderRadius: 7,
                          fontSize: 12,
                          color: "#172033"
                        }}
                      >
                        {log.user?.full_name ||
                          "Unknown user"}
                      </span>

                      {log.user?.role && (
                        <span
                          style={{
                            background: "#f3f5f8",
                            padding: "5px 9px",
                            borderRadius: 7,
                            fontSize: 12,
                            color: "#718096"
                          }}
                        >
                          {String(
                            log.user.role
                          )
                            .charAt(0)
                            .toUpperCase() +
                            String(
                              log.user.role
                            ).slice(1)}
                        </span>
                      )}

                      {activity.type ===
                        "sale" &&
                        sale.total !== undefined && (
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 13
                            }}
                          >
                            {moneyValue(sale.total)}
                          </span>
                        )}

                      {activity.type ===
                        "sale" &&
                        sale.receipt && (
                          <span
                            style={{
                              color: "#718096",
                              fontSize: 12
                            }}
                          >
                            {sale.receipt}
                          </span>
                        )}

                      {activity.type ===
                        "stock" &&
                        product.oldStock !==
                          undefined &&
                        product.newStock !==
                          undefined && (
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 13
                            }}
                          >
                            {product.oldStock} →{" "}
                            {product.newStock} units
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
function Staff({notify}:{notify:(s:string)=>void}) {
  const [staff, setStaff] = useState<any[]>([]);
const [showAddStaff, setShowAddStaff] = useState(false);

const [staffForm, setStaffForm] = useState({
  name: "",
  email: "",
  phone: "",
  role: "cashier"
});

const [staffSaving, setStaffSaving] = useState(false);
const [editingStaff, setEditingStaff] = useState<any | null>(null);

const [staffEditForm, setStaffEditForm] = useState({
  name: "",
  phone: "",
  role: "cashier"
});
const saveStaffEdit = async () => {
  if (!supabase || !editingStaff) return;

  const name = staffEditForm.name.trim();
  const phone = staffEditForm.phone.trim();
  const role = staffEditForm.role;

  if (!name) {
    notify("Full name is required.");
    return;
  }

  setStaffSaving(true);

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        phone: phone || null,
        role,
        updated_at: new Date().toISOString()
      })
      .eq("id", editingStaff.id);

    if (error) throw error;

    setStaff(current =>
      current.map(person =>
        person.id === editingStaff.id
          ? {
              ...person,
              full_name: name,
              phone: phone || null,
              role
            }
          : person
      )
    );

    setEditingStaff(null);

    notify("Staff profile updated.");
  } catch (error) {
    console.error("Staff update error:", error);

    notify(
      error instanceof Error
        ? error.message
        : "Could not update staff profile."
    );
  } finally {
    setStaffSaving(false);
  }
};


  useEffect(() => {
    if (!supabase) return;

    supabase
      .from("profiles")
      .select("id,full_name,role,phone,avatar_url")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Staff load error:", error);
          notify("Could not load staff.");
          return;
        }

        setStaff(data ?? []);
      });
  }, []);

  const roleDescription = (role:string) => {
    switch (role) {
      case "owner":
        return "Full access";
      case "manager":
        return "Inventory, reports & sales";
      case "cashier":
        return "POS & own sales";
      default:
        return "Access configured";
    }
  };
const inviteStaff = async () => {
  if (!supabase) {
    notify("Supabase is not configured.");
    return;
  }

  const name = staffForm.name.trim();
  const email = staffForm.email.trim();
  const phone = staffForm.phone.trim();
  const role = staffForm.role;

  if (!name || !email) {
    notify("Name and email are required.");
    return;
  }

  setStaffSaving(true);

  try {
    const { data, error } = await supabase.functions.invoke(
      "create-staff",
      {
        body: {
          name,
          email,
          phone,
          role
        }
      }
    );

    if (error) {
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    notify(data?.message || "Staff invitation sent.");

    setStaffForm({
      name: "",
      email: "",
      phone: "",
      role: "cashier"
    });

    setShowAddStaff(false);

    const { data: refreshed, error: refreshError } = await supabase
      .from("profiles")
      .select("id,full_name,role,phone,avatar_url")
      .order("created_at", { ascending: true });

    if (!refreshError) {
      setStaff(refreshed ?? []);
    }
  } catch (error) {
    console.error("Staff invitation error:", error);

    notify(
      error instanceof Error
        ? error.message
        : "Could not invite staff."
    );
  } finally {
    setStaffSaving(false);
  }
};

  return (
    <section className="content">
      <div className="page-head">
        <div>
          <h2>Staff & access</h2>
          <p>Control who can use Meow and what they can do.</p>
        </div>

        <button
          className="primary"
          onClick={() => setShowAddStaff(true)}
        >
          <Users size={18}/> Add staff
        </button>
      </div>

      <div className="staff-grid">
        {staff.length === 0 ? (
          <div className="panel">
            <p>No staff profiles found.</p>
          </div>
        ) : (
          staff.map((person) => {
            const role = String(person.role || "cashier");
            const name = person.full_name || "Unnamed staff";

            return (
              <div
  className="staff-card"
  key={person.id}
  onClick={() => {
    setEditingStaff(person);
    setStaffEditForm({
      name: person.full_name || "",
      phone: person.phone || "",
      role: person.role || "cashier"
    });
  }}
  style={{ cursor: "pointer" }}
>
                <div className="avatar big">
                  {person.avatar_url
                    ? <img
                        src={person.avatar_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "inherit"
                        }}
                      />
                    : name.charAt(0).toUpperCase()
                  }
                </div>

                <div>
                  <h3>{name}</h3>

                  <span className="role">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>

                  <p>{roleDescription(role)}</p>
                </div>

                <ChevronRight/>
              </div>
            );
          })
                )}
      </div>

      {showAddStaff && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel-head">
            <div>
              <h3>Add staff member</h3>
              <p>Create a Manager or Cashier account.</p>
            </div>
          </div>

          <div
            className="settings-grid"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <label>
              Full name
              <input
                value={staffForm.name}
                onChange={(e) =>
                  setStaffForm({
                    ...staffForm,
                    name: e.target.value
                  })
                }
                placeholder="e.g. John Doe"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={staffForm.email}
                onChange={(e) =>
                  setStaffForm({
                    ...staffForm,
                    email: e.target.value
                  })
                }
                placeholder="staff@example.com"
              />
            </label>

            <label>
              Phone
              <input
                value={staffForm.phone}
                onChange={(e) =>
                  setStaffForm({
                    ...staffForm,
                    phone: e.target.value
                  })
                }
                placeholder="08012345678"
              />
            </label>

            <label>
              Role
              <select
                value={staffForm.role}
                onChange={(e) =>
                  setStaffForm({
                    ...staffForm,
                    role: e.target.value
                  })
                }
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </label>
          </div>

          <div
            className="modal-actions"
            style={{
              marginTop: 18,
              borderTop: "1px solid #edf0f3",
              paddingTop: 15
            }}
          >
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setShowAddStaff(false);
                setStaffForm({
                  name: "",
                  email: "",
                  phone: "",
                  role: "cashier"
                });
              }}
            >
              Cancel
            </button>

            <button
              className="primary"
              type="button"
              disabled={staffSaving}
              onClick={inviteStaff}
            >
              {staffSaving ? "Sending..." : "Send invitation"}
            </button>
          </div>
        </div>
            )}

      {editingStaff && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <div>
                <span className="pill">STAFF</span>
                <h2>Edit Staff</h2>
              </div>

              <button
                className="icon-btn"
                onClick={() => setEditingStaff(null)}
              >
                ×
              </button>
            </div>

            <label className="modal-label">
              Full name
              <input
                value={staffEditForm.name}
                onChange={(e) =>
                  setStaffEditForm({
                    ...staffEditForm,
                    name: e.target.value
                  })
                }
              />
            </label>

            <label className="modal-label">
              Phone
              <input
                value={staffEditForm.phone}
                onChange={(e) =>
                  setStaffEditForm({
                    ...staffEditForm,
                    phone: e.target.value
                  })
                }
              />
            </label>

            <label className="modal-label">
              Role
              <select
                value={staffEditForm.role}
                onChange={(e) =>
                  setStaffEditForm({
                    ...staffEditForm,
                    role: e.target.value
                  })
                }
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                {editingStaff.role === "owner" && (
                  <option value="owner">Owner</option>
                )}
              </select>
            </label>

            <div
  className="modal-actions"
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  }}
>
  <button
    type="button"
    className="ghost"
    style={{
      color: "#b42318",
      borderColor: "#f1b5b5",
    }}
    disabled={
      staffSaving ||
      editingStaff.role === "owner"
    }
    onClick={async () => {
      if (!editingStaff) return;

      if (editingStaff.role === "owner") {
        notify("The owner account cannot be deleted.");
        return;
      }

      const confirmed = window.confirm(
        `Delete ${editingStaff.full_name || "this staff member"}?\n\nThis will remove their Meow access. This action cannot be undone.`
      );

      if (!confirmed) return;

      setStaffSaving(true);

      try {
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const { data, error } =
          await supabase.functions.invoke("Delete-Staff", {
            body: {
              user_id: editingStaff.id,
            },
          });

        if (error) throw error;

        if (data?.error) {
          throw new Error(data.error);
        }

        setStaff((current) =>
          current.filter(
            (person) => person.id !== editingStaff.id
          )
        );

        setEditingStaff(null);

        notify("Staff member deleted successfully.");
      } catch (error: any) {
        console.error("Delete staff error:", error);
        notify(
          error?.message ||
          "Could not delete staff member."
        );
      } finally {
        setStaffSaving(false);
      }
    }}
  >
    Delete staff
  </button>

  <div style={{ display: "flex", gap: 10 }}>
    <button
      type="button"
      className="ghost"
      onClick={() => setEditingStaff(null)}
    >
      Cancel
    </button>

    <button
      type="button"
      className="primary"
      disabled={staffSaving}
      onClick={saveStaffEdit}
    >
      {staffSaving ? "Saving..." : "Save changes"}
    </button>
  </div>
</div>
          </div>
        </div>
      )}
    </section>
  );
}

function Checkout({
  total,
  cart,
  money,
  close,
  complete,
}: {
  total: number;
  cart: CartItem[];
  money: (n: number) => string;
  close: () => void;
  complete: (
    method: string,
    amountPaid: number,
    discount: number,
    vat: number,
    finalTotal: number
  ) => void;
}) {
  const [method, setMethod] = useState("pos");
  const [discountEnabled, setDiscountEnabled] = useState(false);

  const discountRate = 0.02;
  const vatRate = 0.075;

  const discount = discountEnabled
    ? total * discountRate
    : 0;

  const taxableAmount = total - discount;
  const vat = taxableAmount * vatRate;
  const finalTotal = taxableAmount + vat;

  const [paid, setPaid] = useState(finalTotal.toFixed(2));

  const amount = Number(paid) || 0;
  const change = Math.max(0, amount - finalTotal);

  return (
    <div className="modal-backdrop">
      <div className="modal">

        <div className="modal-head">
          <div>
            <span className="pill">CHECKOUT</span>
            <h2>Complete sale</h2>
          </div>

          <button className="icon-btn" onClick={close}>
            <X />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "10px",
            marginBottom: "18px",
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Subtotal</span>
            <strong>{money(total)}</strong>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={discountEnabled}
              onChange={(e) =>
                setDiscountEnabled(e.target.checked)
              }
              style={{
                width: "18px",
                height: "18px",
              }}
            />

            <span>
              Apply 2% discount
            </span>
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: discount > 0 ? "#b42318" : undefined,
            }}
          >
            <span>Discount (2%)</span>
            <strong>
              {discount > 0
                ? `-${money(discount)}`
                : money(0)}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>VAT (7.5%)</span>
            <strong>{money(vat)}</strong>
          </div>

          <div
            className="checkout-total"
            style={{
              marginTop: "6px",
            }}
          >
            <span>Total due</span>
            <strong>{money(finalTotal)}</strong>
          </div>

        </div>

        <div className="pay-methods">

          <button
            className={`method ${
              method === "pos" ? "selected" : ""
            }`}
            onClick={() => setMethod("pos")}
          >
            <CreditCard size={18} />
            <span>POS</span>
          </button>

          <button
            className={`method ${
              method === "cash" ? "selected" : ""
            }`}
            onClick={() => setMethod("cash")}
          >
            <Banknote size={18} />
            <span>Cash</span>
          </button>

          <button
            className={`method ${
              method === "transfer" ? "selected" : ""
            }`}
            onClick={() => setMethod("transfer")}
          >
            <Smartphone size={18} />
            <span>Transfer</span>
          </button>

        </div>

        <label>
          Amount received

          <input
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            inputMode="decimal"
          />
        </label>

        <div className="change">
          <span>Change due</span>
          <b>{money(change)}</b>
        </div>

        <div
          className="modal-actions"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "18px",
            width: "100%",
          }}
        >

          <button className="ghost" onClick={close}>
            Cancel
          </button>

          <button
            className="primary"
            disabled={amount < finalTotal}
            onClick={() =>
              complete(
                method,
                amount,
                discount,
                vat,
                finalTotal
              )
            }
          >
            Complete sale <Receipt size={17} />
          </button>

        </div>

      </div>
    </div>
  );
}

export default App;