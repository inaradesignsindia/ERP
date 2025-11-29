import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, Settings, Plus, Search, Menu, X, TrendingUp, 
  AlertCircle, FileText, Upload, Instagram, Facebook, Store, DollarSign, 
  CheckCircle, RotateCcw, Wallet, PieChart, Download, Globe, Users, Lock, 
  ArrowRightLeft, Coins, ShoppingCart, Trash2, Link, Truck, MapPin, RefreshCw, Mail
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, collection, addDoc, query, onSnapshot, deleteDoc, doc, 
  serverTimestamp, writeBatch, orderBy
} from "firebase/firestore";

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCTrenpSXNMR78_5r3zXAmD5aXO7jFxxD4",
  authDomain: "satika-cc4c3.firebaseapp.com",
  projectId: "satika-cc4c3",
  storageBucket: "satika-cc4c3.firebasestorage.app",
  messagingSenderId: "370343505568",
  appId: "1:370343505568:web:551fa56872706a0a8463c5"
};

const APP_ID = 'satika-erp-v1'; 
const COMPANY_ID = 'satika_main_store_01'; // Shared Company ID

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- BRANDING ---
const BRAND = {
  primary: "bg-[#800020]", primaryText: "text-[#800020]",
  accent: "bg-[#D4AF37]", accentText: "text-[#D4AF37]",
  gradient: "bg-gradient-to-r from-[#800020] to-[#500010]",
  light: "bg-[#fcf5f5]"
};

// --- UTILITY COMPONENTS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 ${className}`}>{children}</div>
);
const Badge = ({ children, type = "default" }) => {
  const styles = {
    default: "bg-slate-100 text-slate-600", success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700", danger: "bg-rose-100 text-rose-700",
    maroon: "bg-[#800020]/10 text-[#800020]", gold: "bg-[#D4AF37]/20 text-[#856d1e]",
    info: "bg-blue-100 text-blue-700"
  };
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${styles[type] || styles.default}`}>{children}</span>;
};
const Button = ({ children, onClick, variant = "primary", icon: Icon, className = "", disabled = false }) => {
  const variants = {
    primary: `${BRAND.primary} text-white hover:opacity-90 shadow-md`,
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />}{children}
    </button>
  );
};
const downloadCSV = (data, filename) => {
  if (!data || !data.length) return alert("No data to export");
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(","));
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + [headers, ...rows].join("\n")));
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- MODULES ---

const Dashboard = ({ inventory, invoices, expenses, currentUser }) => {
  const metrics = useMemo(() => {
    const sales = invoices.filter(i => i.status !== 'Returned').reduce((a, b) => a + parseFloat(b.total || 0), 0);
    const expenseTotal = expenses.reduce((a, b) => a + parseFloat(b.amount || 0), 0);
    // Simple COGS estimate
    const cost = invoices.filter(i => i.status !== 'Returned').reduce((a, inv) => a + (inv.items?.reduce((c, i) => c + ((i.cost || i.price * 0.7) * i.qty), 0) || 0), 0);
    return { sales, profit: sales - cost - expenseTotal, expenseTotal };
  }, [invoices, expenses]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <h2 className={`text-2xl font-serif font-bold ${BRAND.primaryText}`}>Welcome, {currentUser?.name}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${BRAND.gradient} text-white border-none`}>
          <p className="text-[#D4AF37] text-sm font-medium mb-1">Total Revenue</p>
          <h3 className="text-2xl font-bold">₹{metrics.sales.toLocaleString()}</h3>
        </Card>
        <Card>
          <p className="text-slate-500 text-sm font-medium mb-1">Low Stock Items</p>
          <h3 className="text-2xl font-bold text-amber-600">{inventory.filter(i => i.quantity < 5).length}</h3>
        </Card>
        {currentUser.role !== 'Worker' && (
          <>
            <Card>
              <p className="text-slate-500 text-sm font-medium mb-1">Net Profit (Est.)</p>
              <h3 className="text-2xl font-bold text-emerald-600">₹{metrics.profit.toLocaleString()}</h3>
            </Card>
            <Card>
              <p className="text-slate-500 text-sm font-medium mb-1">Total Expenses</p>
              <h3 className="text-2xl font-bold text-slate-700">₹{metrics.expenseTotal.toLocaleString()}</h3>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

// 1. Parties, Vendors & Outlets Module
const PartiesModule = () => {
  const [outlets, setOutlets] = useState([]);
  const [parties, setParties] = useState([]);
  const [newOutlet, setNewOutlet] = useState({ name: '', type: 'Store' });
  const [newParty, setNewParty] = useState({ name: '', type: 'Vendor', contact: '' });

  useEffect(() => {
    const unsubOut = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'outlets'), s => setOutlets(s.docs.map(d=>({id:d.id, ...d.data()}))));
    const unsubParties = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'parties'), s => setParties(s.docs.map(d=>({id:d.id, ...d.data()}))));
    return () => { unsubOut(); unsubParties(); };
  }, []);

  const addOutlet = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'outlets'), newOutlet);
    setNewOutlet({ name: '', type: 'Store' });
  };

  const addParty = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'parties'), newParty);
    setNewParty({ name: '', type: 'Vendor', contact: '' });
  };

  const handleDelete = async (coll, id) => {
    if(window.confirm("Delete this entry?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, coll, id));
  }

  return (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${BRAND.primaryText}`}>Parties, Vendors & Outlets</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outlets Section */}
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2"><Store size={18}/> Sales Channels & Locations</h3>
          <Card>
            <form onSubmit={addOutlet} className="flex gap-2">
              <input className="flex-1 p-2 border rounded" placeholder="Name (e.g., Store 1, Insta)" value={newOutlet.name} onChange={e=>setNewOutlet({...newOutlet, name: e.target.value})} required />
              <select className="p-2 border rounded" value={newOutlet.type} onChange={e=>setNewOutlet({...newOutlet, type: e.target.value})}>
                <option>Store</option><option>Warehouse</option><option>Online</option><option>Pop-up</option>
              </select>
              <Button>Add</Button>
            </form>
          </Card>
          <div className="space-y-2">
            {outlets.map(o => (
              <div key={o.id} className="flex justify-between items-center bg-white p-3 rounded border">
                <div><div className="font-bold">{o.name}</div><div className="text-xs text-slate-500">{o.type}</div></div>
                <button onClick={()=>handleDelete('outlets', o.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>

        {/* Vendors Section */}
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2"><Truck size={18}/> Vendors & Parties</h3>
          <Card>
            <form onSubmit={addParty} className="space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 p-2 border rounded" placeholder="Name (e.g., Owner, Fabric Guy)" value={newParty.name} onChange={e=>setNewParty({...newParty, name: e.target.value})} required />
                <select className="p-2 border rounded" value={newParty.type} onChange={e=>setNewParty({...newParty, type: e.target.value})}>
                  <option>Vendor</option><option>Building Owner</option><option>Manager</option><option>Owner</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input className="flex-1 p-2 border rounded" placeholder="Contact Info" value={newParty.contact} onChange={e=>setNewParty({...newParty, contact: e.target.value})} />
                <Button>Add</Button>
              </div>
            </form>
          </Card>
          <div className="space-y-2">
            {parties.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded border">
                <div><div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">{p.type} • {p.contact}</div></div>
                <button onClick={()=>handleDelete('parties', p.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Inventory Manager (Enhanced with Location)
const InventoryManager = ({ inventory, outlets }) => {
  const [item, setItem] = useState({ name: "", sku: "", quantity: 0, price: 0, cost: 0, location: "" });
  
  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory'), { 
      ...item, 
      quantity: parseInt(item.quantity), 
      price: parseFloat(item.price), 
      cost: parseFloat(item.cost),
      location: item.location || 'Unassigned' 
    });
    setItem({ name: "", sku: "", quantity: 0, price: 0, cost: 0, location: "" });
  };

  return (
    <div className="space-y-4">
      <h2 className={`text-2xl font-bold ${BRAND.primaryText}`}>Inventory Management</h2>
      <Card>
        <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
          <div className="col-span-2"><label className="text-xs font-bold text-slate-500">Item Name</label><input placeholder="Name" className="w-full p-2 border rounded" required value={item.name} onChange={e => setItem({...item, name: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-slate-500">SKU</label><input placeholder="SKU" className="w-full p-2 border rounded" value={item.sku} onChange={e => setItem({...item, sku: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-slate-500">Qty</label><input type="number" placeholder="0" className="w-full p-2 border rounded" required value={item.quantity} onChange={e => setItem({...item, quantity: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-slate-500">Price</label><input type="number" placeholder="0.00" className="w-full p-2 border rounded" required value={item.price} onChange={e => setItem({...item, price: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-slate-500">Location</label>
            <select className="w-full p-2 border rounded" value={item.location} onChange={e => setItem({...item, location: e.target.value})}>
              <option value="">Select Location</option>
              {outlets.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 lg:col-span-1"><Button className="w-full">Add Item</Button></div>
        </form>
      </Card>
      <div className="overflow-auto bg-white rounded-xl border h-[500px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 sticky top-0"><tr><th className="p-3">Name</th><th className="p-3">SKU</th><th className="p-3">Location</th><th className="p-3">Stock</th><th className="p-3">Price</th></tr></thead>
          <tbody>{inventory.map(i => <tr key={i.id} className="border-t hover:bg-slate-50"><td className="p-3">{i.name}</td><td className="p-3 text-slate-500">{i.sku}</td><td className="p-3"><Badge>{i.location}</Badge></td><td className="p-3">{i.quantity}</td><td className="p-3">₹{i.price}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

// 3. Billing & Sales (Renamed + Returns Logic)
const BillingSales = ({ inventory }) => {
  const [cart, setCart] = useState([]);
  const [meta, setMeta] = useState({ customerName: '', channel: 'Store', returnReason: '' });
  const [isReturnMode, setIsReturnMode] = useState(false);

  const handleTransaction = async () => {
    if(cart.length === 0) return;
    if(isReturnMode && !meta.returnReason) return alert("Please enter a reason for return.");

    const batch = writeBatch(db);
    const invRef = doc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'invoices'));
    
    // Calculate Total (Negative if return)
    const absTotal = cart.reduce((a,b)=>a+(b.price*b.qty),0);
    const finalTotal = isReturnMode ? -absTotal : absTotal;

    batch.set(invRef, { 
      items: cart, 
      total: finalTotal, 
      date: new Date().toISOString(), 
      status: isReturnMode ? 'Returned' : 'Paid',
      type: isReturnMode ? 'Credit Note' : 'Invoice',
      reason: meta.returnReason || '',
      ...meta 
    });

    cart.forEach(item => {
      const ref = doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory', item.id);
      const currentQty = inventory.find(i=>i.id===item.id)?.quantity || 0;
      // If Return: INCREASE stock. If Sale: DECREASE stock.
      const newQty = isReturnMode ? currentQty + item.qty : currentQty - item.qty;
      batch.update(ref, { quantity: newQty });
    });

    await batch.commit();
    setCart([]); setMeta({ customerName: '', channel: 'Store', returnReason: '' });
    alert(isReturnMode ? "Return Processed & Stock Updated" : "Sale Complete!");
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)]">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center">
           <h2 className="text-xl font-bold">Product Catalog</h2>
           <div className="flex items-center gap-2">
             <span className={`text-sm font-bold ${isReturnMode ? 'text-rose-600' : 'text-slate-400'}`}>Return Mode</span>
             <button onClick={() => {setIsReturnMode(!isReturnMode); setCart([])}} className={`w-12 h-6 rounded-full transition-colors relative ${isReturnMode ? 'bg-rose-600' : 'bg-slate-300'}`}>
               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isReturnMode ? 'left-7' : 'left-1'}`}></div>
             </button>
           </div>
        </div>
        <div className="flex-1 overflow-auto grid grid-cols-2 md:grid-cols-3 gap-2 content-start">
          {inventory.map(p => (
            <button key={p.id} onClick={() => setCart([...cart, {...p, qty: 1}])} className={`p-3 rounded border text-left transition-all ${isReturnMode ? 'bg-rose-50 border-rose-200' : 'bg-white hover:border-[#800020]'}`}>
              <div className="font-bold">{p.name}</div>
              <div>₹{p.price}</div>
              <div className="text-xs text-slate-500">Stock: {p.quantity} | {p.location}</div>
            </button>
          ))}
        </div>
      </div>

      <Card className={`w-full md:w-96 flex flex-col ${isReturnMode ? 'border-rose-500 border-2' : ''}`}>
        <h3 className={`font-bold mb-2 flex items-center gap-2 ${isReturnMode ? 'text-rose-600' : 'text-[#800020]'}`}>
          {isReturnMode ? <RotateCcw/> : <ShoppingCart/>} 
          {isReturnMode ? 'Customer Return' : 'Current Order'}
        </h3>
        
        <div className="flex-1 overflow-auto mb-2 space-y-1">
          {cart.map((i, idx) => (
            <div key={idx} className="text-sm flex justify-between p-2 bg-slate-50 rounded">
              <span>{i.name}</span>
              <span className={isReturnMode ? 'text-rose-600' : ''}>{isReturnMode ? '-' : ''}₹{i.price}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between font-bold text-xl">
            <span>Total</span>
            <span className={isReturnMode ? 'text-rose-600' : ''}>
              {isReturnMode ? '-' : ''}₹{cart.reduce((a,b)=>a+b.price,0)}
            </span>
          </div>
          
          <input placeholder="Customer Name" className="w-full p-2 border rounded" value={meta.customerName} onChange={e => setMeta({...meta, customerName: e.target.value})} />
          
          {isReturnMode && (
            <textarea placeholder="Reason for Return (Required)" className="w-full p-2 border rounded border-rose-300 bg-rose-50" rows="2" value={meta.returnReason} onChange={e => setMeta({...meta, returnReason: e.target.value})} />
          )}

          <Button className={`w-full ${isReturnMode ? 'bg-rose-600 hover:bg-rose-700' : ''}`} onClick={handleTransaction}>
            {isReturnMode ? 'Process Refund' : 'Complete Sale'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// 4. Expense Manager (Enhanced)
const ExpenseManager = ({ expenses, outlets, parties }) => {
  const [newExp, setNewExp] = useState({ title: '', amount: '', category: 'Rent', date: new Date().toISOString().split('T')[0], frequency: 'One-time', assignTo: '' });
  
  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'expenses'), { ...newExp, amount: parseFloat(newExp.amount), createdAt: serverTimestamp() });
    setNewExp({ title: '', amount: '', category: 'Rent', date: new Date().toISOString().split('T')[0], frequency: 'One-time', assignTo: '' });
  };

  return (
    <div className="space-y-4">
      <h2 className={`text-2xl font-bold ${BRAND.primaryText}`}>Expense Tracker</h2>
      <Card>
        <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
           <div className="col-span-2"><label className="text-xs font-bold text-slate-500">Description</label><input className="w-full p-2 border rounded" value={newExp.title} onChange={e => setNewExp({...newExp, title: e.target.value})} /></div>
           <div><label className="text-xs font-bold text-slate-500">Amount</label><input type="number" className="w-full p-2 border rounded" value={newExp.amount} onChange={e => setNewExp({...newExp, amount: e.target.value})} /></div>
           <div><label className="text-xs font-bold text-slate-500">Category</label><select className="w-full p-2 border rounded" value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value})}><option>Rent</option><option>Salaries</option><option>Utilities</option><option>Stock</option><option>Marketing</option></select></div>
           
           <div><label className="text-xs font-bold text-slate-500">Frequency</label>
             <select className="w-full p-2 border rounded" value={newExp.frequency} onChange={e => setNewExp({...newExp, frequency: e.target.value})}><option>One-time</option><option>Recurring</option></select>
           </div>
           
           <div className="col-span-2"><label className="text-xs font-bold text-slate-500">Assign to (Outlet/Vendor)</label>
             <select className="w-full p-2 border rounded" value={newExp.assignTo} onChange={e => setNewExp({...newExp, assignTo: e.target.value})}>
               <option value="">-- Select Entity --</option>
               <optgroup label="Outlets">{outlets.map(o=><option key={o.id} value={o.name}>{o.name}</option>)}</optgroup>
               <optgroup label="Vendors">{parties.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</optgroup>
             </select>
           </div>
           
           <Button>Save Expense</Button>
        </form>
      </Card>
      <div className="overflow-auto bg-white rounded-xl border h-96">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Date</th><th className="p-3">Desc</th><th className="p-3">Assigned To</th><th className="p-3">Type</th><th className="p-3 text-right">Amount</th></tr></thead>
        <tbody>{expenses.map(e => <tr key={e.id} className="border-t"><td className="p-3">{e.date}</td><td className="p-3">{e.title} <Badge>{e.category}</Badge></td><td className="p-3 text-xs">{e.assignTo}</td><td className="p-3 text-xs">{e.frequency}</td><td className="p-3 text-right font-bold">₹{e.amount}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
};

// 5. Integrations Module (New)
const IntegrationsModule = () => {
  return (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${BRAND.primaryText}`}>Integrations</h2>
      <p className="text-slate-500">Connect your external sales channels and tools.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Instagram Shop', icon: Instagram, color: 'text-pink-600', status: 'Connect' },
          { name: 'Facebook Business', icon: Facebook, color: 'text-blue-600', status: 'Connect' },
          { name: 'Shopify', icon: ShoppingCart, color: 'text-green-600', status: 'Coming Soon' },
          { name: 'Email Notifications', icon: Mail, color: 'text-orange-500', status: 'Configure' },
        ].map((tool, i) => (
          <Card key={i} className="flex flex-col items-center text-center p-6 hover:shadow-md transition-shadow">
            <tool.icon size={48} className={`mb-4 ${tool.color}`} />
            <h3 className="font-bold text-lg">{tool.name}</h3>
            <p className="text-xs text-slate-400 mb-6">Sync inventory and sales automatically.</p>
            <Button variant={tool.status === 'Coming Soon' ? 'ghost' : 'secondary'} className="w-full">
              {tool.status === 'Connect' ? <><Link size={16}/> Connect</> : tool.status}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

// 6. Reports Module (RESTORED)
const ReportsModule = ({ invoices, expenses }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${BRAND.primaryText}`}>Business Reports</h2>
        <Button onClick={() => downloadCSV(invoices, `satika_sales_report_${new Date().toISOString().split('T')[0]}.csv`)} icon={Download}>Export Sales CSV</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <h3 className="font-bold mb-4 flex items-center gap-2"><FileText size={18}/> Recent Invoices</h3>
            <div className="overflow-auto h-64">
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-white border-b">
                        <tr><th>Date</th><th>Invoice #</th><th>Customer</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                        {invoices.slice(0,20).map(inv => (
                            <tr key={inv.id} className="border-b">
                                <td className="p-2">{new Date(inv.date).toLocaleDateString()}</td>
                                <td className="p-2 font-mono text-xs">{inv.id.slice(0,8)}</td>
                                <td className="p-2">{inv.customerName}</td>
                                <td className="p-2 font-bold">₹{inv.total}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>

        <Card>
            <h3 className="font-bold mb-4 flex items-center gap-2"><DollarSign size={18}/> Recent Expenses</h3>
            <div className="overflow-auto h-64">
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-white border-b">
                        <tr><th>Date</th><th>Category</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                        {expenses.slice(0,20).map(e => (
                            <tr key={e.id} className="border-b">
                                <td className="p-2">{e.date}</td>
                                <td className="p-2"><Badge>{e.category}</Badge></td>
                                <td className="p-2 font-bold text-rose-600">₹{e.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
      </div>
    </div>
  );
};

// --- USER ACCESS (RENAMED) ---
const UserSettings = ({ appId }) => {
  const [team, setTeam] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', role: 'Worker', userId: '', password: '' });
  useEffect(() => onSnapshot(collection(db, 'artifacts', appId, 'users', COMPANY_ID, 'team'), s => setTeam(s.docs.map(d => ({id:d.id, ...d.data()})))), [appId]);
  const handleAdd = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', appId, 'users', COMPANY_ID, 'team'), { ...newMember, createdAt: serverTimestamp() }); setNewMember({ name: '', role: 'Worker', userId: '', password: '' }); };
  return (
    <div className="space-y-4">
      <h2 className={`text-2xl font-bold ${BRAND.primaryText}`}>User Access & Settings</h2>
      <Card>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-2">
          <input placeholder="Name" className="p-2 border rounded" required value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
          <input placeholder="User ID" className="p-2 border rounded" required value={newMember.userId} onChange={e => setNewMember({...newMember, userId: e.target.value.toLowerCase()})} />
          <input placeholder="Password" type="password" className="p-2 border rounded" required value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} />
          <select className="p-2 border rounded" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})}><option>Worker</option><option>Admin</option></select>
          <Button>Add User</Button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">{team.map(m => <Card key={m.id}><h3 className="font-bold">{m.name}</h3><p className="text-sm">@{m.userId} • {m.role}</p></Card>)}</div>
    </div>
  );
};

// --- MAIN APP ---
const SatikaApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Global Data States
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [team, setTeam] = useState([]);
  const [outlets, setOutlets] = useState([]); // For Location Linking
  const [parties, setParties] = useState([]); // For Vendor Linking

  // 1. Data Sync
  useEffect(() => {
    signInAnonymously(auth); 
    const unsubTeam = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'team'), s => setTeam(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubInv = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory'), s => setInventory(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubBill = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'invoices'), s => setInvoices(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubExp = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'expenses'), s => setExpenses(s.docs.map(d => ({id:d.id, ...d.data()}))));
    // New Collections
    const unsubOut = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'outlets'), s => setOutlets(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubParty = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'parties'), s => setParties(s.docs.map(d => ({id:d.id, ...d.data()}))));

    return () => { unsubTeam(); unsubInv(); unsubBill(); unsubExp(); unsubOut(); unsubParty(); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (team.length === 0) {
      const admin = { name: "Owner", role: "Owner", userId: loginId.toLowerCase(), password: loginPass, createdAt: serverTimestamp() };
      await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'team'), admin);
      setCurrentUser(admin); return;
    }
    const member = team.find(m => m.userId === loginId.toLowerCase() && m.password === loginPass);
    member ? setCurrentUser(member) : alert("Invalid Credentials");
  };

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center bg-[#800020] p-4">
      <Card className="w-full max-w-md p-8 space-y-4 text-center">
        <h1 className="text-3xl font-serif font-bold text-[#800020]">SATIKA ERP</h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <input className="w-full p-3 border rounded bg-slate-50" required value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="User ID" />
          <input type="password" className="w-full p-3 border rounded bg-slate-50" required value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Password" />
          <Button className="w-full py-3 bg-gradient-to-r from-[#800020] to-[#500010]">{team.length === 0 ? 'Create Company Account' : 'Login'}</Button>
        </form>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      <div className="md:hidden bg-[#800020] text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <span className="font-serif font-bold text-lg">SATIKA</span>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}><Menu/></button>
      </div>

      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:block fixed md:relative z-40 w-full md:w-64 bg-white h-full border-r flex flex-col`}>
        <div className="p-6 bg-[#800020] text-white hidden md:block"><h1 className="text-2xl font-serif font-bold">SATIKA</h1></div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'billing', icon: ShoppingCart, label: 'Billing & Sales' }, // Renamed
            { id: 'inventory', icon: Package, label: 'Inventory' },
            { id: 'expenses', icon: DollarSign, label: 'Expenses' },
            { id: 'reports', icon: FileText, label: 'Reports' },
            { id: 'parties', icon: Store, label: 'Parties & Outlets', admin: true }, // New
            { id: 'integrations', icon: Link, label: 'Integrations', admin: true }, // New
            { id: 'team', icon: Settings, label: 'User Access & Settings', admin: true }, // Renamed
          ].map(i => (!i.admin || currentUser.role !== 'Worker') && (
            <button key={i.id} onClick={() => {setActiveTab(i.id); setIsMenuOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === i.id ? 'bg-slate-100 font-bold text-[#800020]' : 'text-slate-500 hover:bg-slate-50'}`}>
              <i.icon size={20} />{i.label}
            </button>
          ))}
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-3 p-3 text-rose-600 mt-auto"><Lock size={20}/> Logout</button>
        </nav>
      </div>

      <main className="flex-1 p-4 overflow-auto h-[calc(100vh-60px)] md:h-screen">
        {activeTab === 'dashboard' && <Dashboard inventory={inventory} invoices={invoices} expenses={expenses} currentUser={currentUser} />}
        {activeTab === 'team' && <UserSettings appId={APP_ID} />}
        {activeTab === 'parties' && <PartiesModule />}
        {activeTab === 'integrations' && <IntegrationsModule />}
        {activeTab === 'inventory' && <InventoryManager inventory={inventory} outlets={outlets} />}
        {activeTab === 'billing' && <BillingSales inventory={inventory} />}
        {activeTab === 'expenses' && <ExpenseManager expenses={expenses} outlets={outlets} parties={parties} />}
        {activeTab === 'reports' && <ReportsModule invoices={invoices} expenses={expenses} />}
      </main>
    </div>
  );
};

export default SatikaApp;
