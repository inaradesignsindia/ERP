import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  Plus, 
  Search, 
  Menu, 
  X, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  Upload, 
  Instagram, 
  Facebook, 
  Store, 
  DollarSign, 
  CheckCircle, 
  RotateCcw, 
  Wallet, 
  PieChart, 
  Download, 
  Globe, 
  Users, 
  Lock, 
  ArrowRightLeft, 
  Coins, 
  ShoppingCart, 
  Trash2
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  writeBatch
} from "firebase/firestore";

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyCTrenpSXNMR78_5r3zXAmD5aXO7jFxxD4",
  authDomain: "satika-cc4c3.firebaseapp.com",
  projectId: "satika-cc4c3",
  storageBucket: "satika-cc4c3.firebasestorage.app",
  messagingSenderId: "370343505568",
  appId: "1:370343505568:web:551fa56872706a0a8463c5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'satika-erp-v1'; // FIXED: Hardcoded app ID

// --- Branding ---
const BRAND = {
  primary: "bg-[#800020]", // Maroon
  primaryText: "text-[#800020]",
  accent: "bg-[#D4AF37]", // Gold
  accentText: "text-[#D4AF37]",
  gradient: "bg-gradient-to-r from-[#800020] to-[#500010]",
  light: "bg-[#fcf5f5]"
};

// --- Utility Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, type = "default" }) => {
  const styles = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    maroon: "bg-[#800020]/10 text-[#800020]",
    gold: "bg-[#D4AF37]/20 text-[#856d1e]"
  };
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${styles[type] || styles.default}`}>{children}</span>;
};

const Button = ({ children, onClick, variant = "primary", icon: Icon, className = "", disabled = false, title="" }) => {
  const base = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: `${BRAND.primary} text-white hover:opacity-90 shadow-md shadow-slate-200`,
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200",
    ghost: "text-slate-600 hover:bg-slate-100",
    gold: "bg-[#D4AF37] text-white hover:bg-[#b5952f]"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`} title={title}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const downloadCSV = (data, filename) => {
  if (!data || !data.length) return alert("No data to export");
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(","));
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- MODULE 1: Dashboard ---
const Dashboard = ({ inventory, invoices, expenses, setActiveTab, currentUser }) => {
  const [timeFilter, setTimeFilter] = useState('month'); 
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState({
    sales: true, profit: true, expenses: true, stock: true, channels: true
  });

  const isWorker = currentUser?.role === 'Worker';

  const filteredData = useMemo(() => {
    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    let daysToSubtract = 30;
    
    if (timeFilter === 'week') daysToSubtract = 7;
    if (timeFilter === '3months') daysToSubtract = 90;
    if (timeFilter === '6months') daysToSubtract = 180;
    if (timeFilter === 'year') daysToSubtract = 365;

    const cutoff = now.getTime() - (daysToSubtract * msInDay);
    
    const relevantInvoices = invoices.filter(inv => new Date(inv.date).getTime() >= cutoff && inv.status !== 'Returned');
    const relevantExpenses = expenses.filter(exp => new Date(exp.date).getTime() >= cutoff);

    return { invoices: relevantInvoices, expenses: relevantExpenses };
  }, [invoices, expenses, timeFilter]);

  const metrics = useMemo(() => {
    let sales = 0;
    let costOfGoods = 0;
    let expenseTotal = 0;
    let channelData = { Store: 0, Instagram: 0, Facebook: 0, Website: 0 };

    filteredData.invoices.forEach(inv => {
      sales += parseFloat(inv.total || 0);
      const invCost = inv.items?.reduce((c, item) => c + ((item.cost || item.price * 0.7) * item.qty), 0) || 0;
      costOfGoods += invCost;
      
      const channel = inv.channel || 'Store';
      channelData[channel] = (channelData[channel] || 0) + parseFloat(inv.total || 0);
    });

    filteredData.expenses.forEach(exp => {
      expenseTotal += parseFloat(exp.amount || 0);
    });

    const profit = sales - costOfGoods - expenseTotal;
    return { sales, profit, expenseTotal, channelData };
  }, [filteredData]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className={`text-2xl font-serif font-bold ${BRAND.primaryText}`}>Welcome, {currentUser?.name}</h2>
          <p className="text-xs text-slate-500">Overview for: <span className="font-bold capitalize">{timeFilter}</span></p>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={() => setShowWidgetSettings(!showWidgetSettings)} className="p-2 text-slate-400 hover:text-[#800020]">
             <Settings size={20} />
           </button>
           <div className="flex bg-white rounded-lg border p-1 shadow-sm overflow-x-auto">
            {['week', 'month', '3months', '6months', 'year'].map(t => (
              <button 
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap capitalize ${timeFilter === t ? 'bg-[#800020] text-white font-medium' : 'text-slate-500'}`}
              >
                {t === '3months' ? 'Quarter' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

       {showWidgetSettings && (
        <Card className="mb-4 bg-slate-50 border-dashed border-2 border-slate-200">
           <h4 className="font-bold text-sm mb-2 text-slate-600">Dashboard Configuration</h4>
           <div className="flex flex-wrap gap-4">
             {Object.keys(visibleWidgets).map(key => (
               <label key={key} className="flex items-center gap-2 text-sm capitalize cursor-pointer select-none">
                 <input 
                   type="checkbox" 
                   checked={visibleWidgets[key]} 
                   onChange={() => setVisibleWidgets(prev => ({...prev, [key]: !prev[key]}))}
                   className="rounded text-[#800020] focus:ring-[#800020]"
                 />
                 {key}
               </label>
             ))}
           </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleWidgets.sales && (
          <Card className={`${BRAND.gradient} text-white border-none`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#D4AF37] text-sm font-medium mb-1">Total Sales</p>
                <h3 className="text-2xl font-bold">₹{metrics.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
              </div>
              <div className="p-2 bg-white/10 rounded-lg"><TrendingUp size={20} className="text-[#D4AF37]" /></div>
            </div>
            <div className="mt-2 text-xs opacity-70">Gross Revenue</div>
          </Card>
        )}

        {visibleWidgets.stock && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Low Stock</p>
                <h3 className="text-2xl font-bold text-amber-600">{inventory.filter(i => parseInt(i.quantity) < 10).length}</h3>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg"><AlertCircle size={20} className="text-amber-600" /></div>
            </div>
            <div className="mt-2 text-xs text-slate-400">Items need reorder</div>
          </Card>
        )}

        {!isWorker && visibleWidgets.profit && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Net Profit</p>
                <h3 className={`text-2xl font-bold ${metrics.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{metrics.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </h3>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg"><Wallet size={20} className="text-emerald-600" /></div>
            </div>
            <div className="mt-2 text-xs text-slate-400">Net of COGS & Expenses</div>
          </Card>
        )}

        {!isWorker && visibleWidgets.expenses && (
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Expenses</p>
                <h3 className="text-2xl font-bold text-slate-700">₹{metrics.expenseTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
              </div>
              <div className="p-2 bg-rose-100 rounded-lg"><DollarSign size={20} className="text-rose-600" /></div>
            </div>
            <div className="mt-2 text-xs text-slate-400">Operational costs</div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleWidgets.channels && (
          <Card className="lg:col-span-1">
             <h3 className={`font-bold ${BRAND.primaryText} mb-4 flex items-center gap-2`}>
               <PieChart size={18} /> Sales Channels
             </h3>
             <div className="space-y-4">
               {Object.entries(metrics.channelData).map(([channel, amount]) => (
                 <div key={channel}>
                   <div className="flex justify-between text-sm mb-1">
                     <span className="flex items-center gap-2 text-slate-700">
                       {channel === 'Instagram' && <Instagram size={14} className="text-pink-600"/>}
                       {channel === 'Facebook' && <Facebook size={14} className="text-blue-600"/>}
                       {channel === 'Store' && <Store size={14} className="text-[#800020]"/>}
                       {channel === 'Website' && <Globe size={14} className="text-blue-400"/>}
                       {channel}
                     </span>
                     <span className="font-bold">₹{amount.toLocaleString()}</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2">
                     <div 
                       className={`h-2 rounded-full ${channel === 'Instagram' ? 'bg-pink-500' : channel === 'Facebook' ? 'bg-blue-600' : 'bg-[#800020]'}`} 
                       style={{ width: `${metrics.sales > 0 ? (amount / metrics.sales) * 100 : 0}%` }}
                     ></div>
                   </div>
                 </div>
               ))}
             </div>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <h3 className={`font-bold ${BRAND.primaryText} mb-4`}>Recent Activity</h3>
          <div className="space-y-3">
            {invoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${inv.status === 'Returned' ? 'bg-rose-100 text-rose-600' : 'bg-[#800020]/10 text-[#800020]'}`}>
                    {inv.status === 'Returned' ? <RotateCcw size={14}/> : <CheckCircle size={14}/>}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{inv.customerName || 'Walk-in'} <span className="text-xs text-slate-400">via {inv.channel}</span></p>
                    <p className="text-xs text-slate-500">{new Date(inv.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-sm ${inv.status === 'Returned' ? 'text-rose-600 line-through' : 'text-slate-700'}`}>₹{inv.total}</div>
                  <div className="text-xs text-slate-400">{inv.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isWorker && (
        <div className="p-6 bg-slate-100 rounded-xl text-center text-slate-500">
          <Lock className="mx-auto mb-2 opacity-50" />
          <p>Financial charts are restricted for Worker accounts.</p>
        </div>
      )}
    </div>
  );
};

// --- MODULE 2: Team Module ---
const TeamModule = ({ user, appId }) => {
  const [team, setTeam] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', role: 'Worker', userId: '', password: '', phone: '' });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'team'));
    return onSnapshot(q, (s) => setTeam(s.docs.map(d => ({id: d.id, ...d.data()}))), (e) => console.error(e));
  }, [user, appId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newMember.userId || newMember.password.length < 4) return alert("Please enter valid credentials.");
    if (team.find(m => m.userId === newMember.userId)) return alert("User ID already exists.");

    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'team'), {
      ...newMember, createdAt: serverTimestamp()
    });
    setNewMember({ name: '', role: 'Worker', userId: '', password: '', phone: '' });
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (team.length <= 1) return alert("Cannot delete the last user.");
    if (window.confirm("Remove this user?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'team', id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${BRAND.primaryText}`}>User Management</h2>
        <Button onClick={() => setShowModal(true)} icon={Plus}>Add User</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map(member => (
          <Card key={member.id} className="relative group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${member.role === 'Admin' || member.role === 'Owner' ? 'bg-[#D4AF37] text-white' : 'bg-slate-200 text-slate-600'}`}>
                {member.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-lg">{member.name}</h3>
                <div className="text-sm text-slate-500">@{member.userId}</div>
                <div className="flex gap-2 text-xs mt-1">
                  <Badge type={member.role === 'Admin' || member.role === 'Owner' ? 'gold' : 'default'}>{member.role}</Badge>
                </div>
              </div>
            </div>
            <button onClick={() => handleDelete(member.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X/></button>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Add New User</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <input required placeholder="Full Name" className="w-full p-2 border rounded" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
              <select className="w-full p-2 border rounded" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})}>
                <option value="Worker">Worker (Restricted)</option>
                <option value="Admin">Admin (Full Access)</option>
              </select>
              <input required placeholder="User ID (Login Name)" className="w-full p-2 border rounded bg-slate-50" value={newMember.userId} onChange={e => setNewMember({...newMember, userId: e.target.value.toLowerCase().replace(/\s/g,'')})} />
              <input required placeholder="Password" type="password" className="w-full p-2 border rounded" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1">Create User</Button>
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

// --- MODULE 3: Capital & Equity Module ---
const CapitalModule = ({ user, appId, invoices, expenses }) => {
  const [team, setTeam] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [distributions, setDistributions] = useState([]); 
  const [modal, setModal] = useState({ open: false, type: 'invest' }); 
  const [entry, setEntry] = useState({ ownerId: '', amount: '', notes: '' });

  useEffect(() => {
    if (!user) return;
    const unsubTeam = onSnapshot(query(collection(db, 'artifacts', appId, 'users', COMPANY_ID, 'team')), s => setTeam(s.docs.map(d => ({id:d.id, ...d.data()})).filter(m => m.role === 'Admin' || m.role === 'Owner')), e=>console.log(e));
    const unsubTrans = onSnapshot(query(collection(db, 'artifacts', appId, 'users', COMPANY_ID, 'capital_transactions')), s => setTransactions(s.docs.map(d => d.data())), e=>console.log(e));
    const unsubDist = onSnapshot(query(collection(db, 'artifacts', appId, 'users', COMPANY_ID, 'profit_distributions')), s => setDistributions(s.docs.map(d => d.data())), e=>console.log(e));
    return () => { unsubTeam(); unsubTrans(); unsubDist(); };
  }, [user, appId]);

  const owners = useMemo(() => {
    return team.map(owner => {
      const invested = transactions.filter(t => t.ownerId === owner.id && t.type === 'invest').reduce((a,b) => a + parseFloat(b.amount), 0);
      const withdrawn = transactions.filter(t => t.ownerId === owner.id && t.type === 'withdraw').reduce((a,b) => a + parseFloat(b.amount), 0);
      const profitShare = distributions.filter(d => d.ownerId === owner.id).reduce((a,b) => a + parseFloat(b.amount), 0);
      const equity = invested - withdrawn + profitShare;
      return { ...owner, invested, withdrawn, profitShare, equity };
    });
  }, [team, transactions, distributions]);

  const financials = useMemo(() => {
    let totalSales = 0, totalCOGS = 0, totalExp = 0;
    invoices.forEach(inv => {
      if(inv.status !== 'Returned') {
        totalSales += parseFloat(inv.total||0);
        totalCOGS += inv.items?.reduce((c, i) => c + ((i.cost||i.price*0.7)*i.qty),0) || 0;
      }
    });
    expenses.forEach(e => totalExp += parseFloat(e.amount||0));
    const lifetimeNetProfit = totalSales - totalCOGS - totalExp;
    const totalDistributed = distributions.reduce((a,b) => a + parseFloat(b.amount), 0);
    const availableProfit = lifetimeNetProfit - totalDistributed;

    return { lifetimeNetProfit, totalDistributed, availableProfit };
  }, [invoices, expenses, distributions]);

  const handleTransaction = async (e) => {
    e.preventDefault();
    if(!entry.ownerId || !entry.amount) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'capital_transactions'), {
      ...entry, type: modal.type, date: new Date().toISOString()
    });
    setModal({ open: false, type: 'invest' }); setEntry({ ownerId: '', amount: '', notes: '' });
  };

  const distributeProfit = async (ownerId, amount) => {
    if(!amount || amount <= 0) return;
    if(amount > financials.availableProfit) return alert("Not enough available profit!");
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'profit_distributions'), {
      ownerId, amount: parseFloat(amount), date: new Date().toISOString()
    });
    alert("Profit Allocated!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
         <div>
            <h2 className={`text-2xl font-bold ${BRAND.primaryText}`}>Capital & Equity</h2>
            <p className="text-sm text-slate-500">Track investments, drawings, and ROI.</p>
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setModal({open: true, type: 'withdraw'})} icon={ArrowRightLeft}>Withdraw</Button>
            <Button onClick={() => setModal({open: true, type: 'invest'})} icon={Plus}>Add Investment</Button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 text-white">
          <div className="text-sm text-slate-400">Total Company Equity</div>
          <div className="text-3xl font-bold mt-1">₹{owners.reduce((a,b) => a + b.equity, 0).toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-2">What company owes owners</div>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <div className="text-sm text-emerald-800 font-bold">Available Profit for Distribution</div>
          <div className="text-3xl font-bold mt-1 text-emerald-600">₹{financials.availableProfit.toLocaleString()}</div>
          <div className="text-xs text-emerald-600 mt-2">Lifetime Profit - Distributed</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Lifetime Net Profit</div>
          <div className="text-2xl font-bold mt-1">₹{financials.lifetimeNetProfit.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-2">Sales - COGS - Expenses</div>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold mb-4">Owner Equity Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3 text-right">Invested</th>
                <th className="p-3 text-right">Withdrawn</th>
                <th className="p-3 text-right">Profit Share</th>
                <th className="p-3 text-right">Net Equity</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {owners.map(o => (
                <tr key={o.id} className="border-b">
                  <td className="p-3 font-medium">{o.name} <div className="text-xs text-slate-400">@{o.userId}</div></td>
                  <td className="p-3 text-right text-slate-500">₹{o.invested.toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-500">(-) ₹{o.withdrawn.toLocaleString()}</td>
                  <td className="p-3 text-right text-emerald-600">(+) ₹{o.profitShare.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold text-lg">₹{o.equity.toLocaleString()}</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button 
                      onClick={() => {
                         const amt = prompt(`Distribute profit to ${o.name}? (Max: ${financials.availableProfit})`);
                         if(amt) distributeProfit(o.id, amt);
                      }}
                      className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200"
                    >
                      + Share Profit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm animate-fade-in">
             <h3 className="font-bold text-lg mb-4 capitalize">{modal.type} Funds</h3>
             <form onSubmit={handleTransaction} className="space-y-3">
               <select className="w-full p-2 border rounded" required value={entry.ownerId} onChange={e => setEntry({...entry, ownerId: e.target.value})}>
                 <option value="">Select User</option>
                 {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
               </select>
               <input type="number" required placeholder="Amount" className="w-full p-2 border rounded" value={entry.amount} onChange={e => setEntry({...entry, amount: e.target.value})} />
               <input placeholder="Notes" className="w-full p-2 border rounded" value={entry.notes} onChange={e => setEntry({...entry, notes: e.target.value})} />
               <div className="flex gap-2 pt-2">
                 <Button className="flex-1 capitalize">{modal.type}</Button>
                 <Button type="button" variant="ghost" onClick={() => setModal({open: false, type: 'invest'})}>Cancel</Button>
               </div>
             </form>
          </Card>
        </div>
      )}
    </div>
  );
};

// --- MODULE 4: Expense Manager ---
const ExpenseManager = ({ expenses, user, appId }) => {
  const [newExp, setNewExp] = useState({ title: '', amount: '', category: 'Rent', date: new Date().toISOString().split('T')[0] });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const categories = ['Rent', 'Salaries', 'Utilities', 'Maintenance', 'Marketing', 'Inventory Purchase', 'Other'];

  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), { ...newExp, amount: parseFloat(newExp.amount), createdAt: serverTimestamp() });
    setNewExp({ title: '', amount: '', category: 'Rent', date: new Date().toISOString().split('T')[0] }); setIsFormOpen(false);
  };
  const handleDelete = async (id) => { if(window.confirm("Delete?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', id)); };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className={`text-xl font-bold ${BRAND.primaryText}`}>Expense Tracker</h2>
        <Button onClick={() => setIsFormOpen(true)} icon={Plus}>Add Expense</Button>
      </div>
      {isFormOpen && (
        <Card className="bg-slate-50 border-2 border-[#800020]/10">
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-2 items-end">
             <input className="flex-1 p-2 border rounded w-full" placeholder="Desc" value={newExp.title} onChange={e => setNewExp({...newExp, title: e.target.value})} />
             <input type="number" className="w-32 p-2 border rounded" placeholder="Amt" value={newExp.amount} onChange={e => setNewExp({...newExp, amount: e.target.value})} />
             <select className="w-40 p-2 border rounded" value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select>
             <input type="date" className="w-40 p-2 border rounded" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} />
             <Button>Save</Button>
          </form>
        </Card>
      )}
      <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#800020]/5 text-[#800020] sticky top-0"><tr><th className="p-3">Date</th><th className="p-3">Desc</th><th className="p-3 text-right">Amt</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y">{expenses.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>(<tr key={e.id}><td className="p-3">{e.date}</td><td className="p-3">{e.title} <Badge>{e.category}</Badge></td><td className="p-3 text-right font-bold">₹{e.amount}</td><td className="p-3"><button onClick={()=>handleDelete(e.id)}><X size={14}/></button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
};

// --- MODULE 5: Inventory Manager ---
const InventoryManager = ({ inventory, user, appId }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [item, setItem] = useState({ name: "", sku: "", quantity: 0, price: 0, cost: 0, location: "Main Warehouse" });
  const [search, setSearch] = useState("");
  const [bulkData, setBulkData] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory'), { ...item, quantity: parseInt(item.quantity), price: parseFloat(item.price), cost: parseFloat(item.cost), createdAt: serverTimestamp() });
    setShowAdd(false); setItem({ name: "", sku: "", quantity: 0, price: 0, cost: 0, location: "Main Warehouse" });
  };

  const handleBulkUpload = async () => {
    const lines = bulkData.trim().split('\n');
    let count = 0;
    const batch = writeBatch(db); 
    
    // Process only first 20 for safety in one go or standard loops for more
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const line = lines[i];
        const [name, sku, quantity, price, location] = line.split(',');
        if (name && price) {
            const ref = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory'));
            batch.set(ref, {
                name: name.trim(), 
                sku: sku?.trim() || `SKU-${Math.floor(Math.random()*1000)}`,
                quantity: parseInt(quantity) || 0, 
                price: parseFloat(price) || 0,
                cost: parseFloat(price) * 0.7 || 0, 
                location: location?.trim() || "Main Warehouse",
                createdAt: serverTimestamp()
            });
            count++;
        }
    }
    await batch.commit();
    setShowBulk(false); setBulkData(""); alert(`Uploaded ${count} items!`);
  };

  const handleDelete = async (id) => { if(window.confirm("Delete this item?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', id)); };

  const filtered = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between gap-2">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
            <input className="w-full pl-10 p-2 border rounded-lg bg-slate-50" placeholder="Search by Name or SKU..." value={search} onChange={e=>setSearch(e.target.value)} />
         </div>
         <div className="flex gap-2">
             <Button variant="secondary" onClick={() => setShowBulk(true)} icon={Upload}>Bulk Import</Button>
             <Button onClick={() => setShowAdd(true)} icon={Plus}>Add Item</Button>
         </div>
      </div>

      {showAdd && (
        <Card className="bg-slate-50 border-2 border-[#800020]/10">
          <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
             <div className="col-span-2"><label className="text-xs font-bold text-slate-500">Item Name</label><input required className="w-full p-2 border rounded" placeholder="Product Name" value={item.name} onChange={e => setItem({...item, name: e.target.value})} /></div>
             <div><label className="text-xs font-bold text-slate-500">SKU</label><input className="w-full p-2 border rounded" placeholder="SKU-001" value={item.sku} onChange={e => setItem({...item, sku: e.target.value})} /></div>
             <div><label className="text-xs font-bold text-slate-500">Qty</label><input required type="number" className="w-full p-2 border rounded" value={item.quantity} onChange={e => setItem({...item, quantity: e.target.value})} /></div>
             <div><label className="text-xs font-bold text-slate-500">Price (MRP)</label><input required type="number" className="w-full p-2 border rounded" value={item.price} onChange={e => setItem({...item, price: e.target.value})} /></div>
             <div><label className="text-xs font-bold text-slate-500">Cost (Buy)</label><input required type="number" className="w-full p-2 border rounded" value={item.cost} onChange={e => setItem({...item, cost: e.target.value})} /></div>
             <div className="col-span-2 md:col-span-1 pt-4"><Button className="w-full">Save</Button></div>
          </form>
        </Card>
      )}

      {showBulk && (
         <Card className="fixed inset-0 z-50 m-auto max-w-lg h-96 flex flex-col shadow-2xl">
            <div className="flex justify-between mb-2 font-bold"><span>Bulk Upload (CSV)</span><button onClick={()=>setShowBulk(false)}><X/></button></div>
            <p className="text-xs text-slate-500 mb-2">Format: Name, SKU, Quantity, Price, Location</p>
            <textarea className="flex-1 border p-2 rounded bg-slate-50 font-mono text-xs" placeholder={`Silk Saree, SKU-99, 10, 2500, Shelf A\nCotton Suit, SKU-100, 5, 1200, Shelf B`} value={bulkData} onChange={e => setBulkData(e.target.value)}></textarea>
            <Button className="mt-2" onClick={handleBulkUpload}>Process Upload</Button>
         </Card>
      )}

      <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#800020]/5 text-[#800020] sticky top-0 z-10">
            <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Cost</th>
                <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(i => (
                <tr key={i.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-slate-500 text-xs">{i.sku}</td>
                    <td className="p-3 text-right">
                        <Badge type={i.quantity < 5 ? 'danger' : i.quantity < 10 ? 'warning' : 'success'}>{i.quantity}</Badge>
                    </td>
                    <td className="p-3 text-right">₹{i.price}</td>
                    <td className="p-3 text-right text-slate-400">₹{i.cost}</td>
                    <td className="p-3 text-center"><button onClick={()=>handleDelete(i.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button></td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- MODULE 6: POS System (Required for Reports) ---
const POSSystem = ({ inventory, user, appId }) => {
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState("");
    const [checkoutMeta, setCheckoutMeta] = useState({ customerName: '', phone: '', channel: 'Store' });

    const addToCart = (product) => {
        const existing = cart.find(c => c.id === product.id);
        if(existing) {
            setCart(cart.map(c => c.id === product.id ? {...c, qty: c.qty + 1} : c));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));
    
    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const handleCheckout = async () => {
        if(cart.length === 0) return;
        const batch = writeBatch(db);

        // 1. Create Invoice
        const invoiceRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'invoices'));
        batch.set(invoiceRef, {
            items: cart.map(({id, name, price, cost, qty}) => ({id, name, price, cost, qty})),
            total: cartTotal,
            date: new Date().toISOString(),
            status: 'Paid',
            customerName: checkoutMeta.customerName || 'Walk-in',
            phone: checkoutMeta.phone,
            channel: checkoutMeta.channel
        });

        // 2. Reduce Inventory
        for(let item of cart) {
             const itemRef = doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', item.id);
             // Note: In real app, check stock first. Here we assume stock exists for simplicity or allow negative
             const currentStock = inventory.find(i => i.id === item.id)?.quantity || 0;
             batch.update(itemRef, { quantity: currentStock - item.qty });
        }

        await batch.commit();
        setCart([]);
        setCheckoutMeta({ customerName: '', phone: '', channel: 'Store' });
        alert("Order Completed!");
    };

    const filteredProducts = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) && i.quantity > 0);

    return (
        <div className="h-full flex gap-4">
            {/* Product Grid */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                    <input className="w-full pl-10 p-2 border rounded-lg" placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <div className="flex-1 overflow-auto bg-slate-50 p-2 rounded-xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 content-start">
                    {filteredProducts.map(prod => (
                        <button key={prod.id} onClick={() => addToCart(prod)} className="bg-white p-3 rounded-lg border hover:shadow-md hover:border-[#800020] transition-all text-left flex flex-col justify-between h-32">
                            <div className="font-medium text-sm line-clamp-2">{prod.name}</div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">{prod.sku}</div>
                                <div className="font-bold text-[#800020]">₹{prod.price}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cart */}
            <Card className="w-96 flex flex-col h-full">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingCart size={20}/> Current Order</h3>
                
                <div className="flex-1 overflow-auto space-y-2 mb-4">
                    {cart.length === 0 ? (
                        <div className="text-center text-slate-400 mt-10 italic">Cart is empty</div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                                <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-slate-500">₹{item.price} x {item.qty}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="font-bold">₹{item.price * item.qty}</div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-rose-400 hover:text-rose-600"><X size={14}/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t pt-4 space-y-3">
                    <input className="w-full p-2 border rounded text-sm" placeholder="Customer Name" value={checkoutMeta.customerName} onChange={e => setCheckoutMeta({...checkoutMeta, customerName: e.target.value})} />
                    <div className="flex gap-2">
                        <input className="w-full p-2 border rounded text-sm" placeholder="Phone" value={checkoutMeta.phone} onChange={e => setCheckoutMeta({...checkoutMeta, phone: e.target.value})} />
                        <select className="p-2 border rounded text-sm" value={checkoutMeta.channel} onChange={e => setCheckoutMeta({...checkoutMeta, channel: e.target.value})}>
                            <option>Store</option>
                            <option>Instagram</option>
                            <option>WhatsApp</option>
                        </select>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold text-[#800020]">
                        <span>Total</span>
                        <span>₹{cartTotal}</span>
                    </div>
                    <Button className="w-full py-3 text-lg" onClick={handleCheckout} disabled={cart.length === 0}>Complete Sale</Button>
                </div>
            </Card>
        </div>
    );
};

// --- MODULE 7: Reports Module ---
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
                        <tr><th>Date</th><th>Invoice #</th><th>Customer</th><th>Items</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                        {invoices.slice(0,20).map(inv => (
                            <tr key={inv.id} className="border-b">
                                <td className="p-2">{new Date(inv.date).toLocaleDateString()}</td>
                                <td className="p-2 font-mono text-xs">{inv.id.slice(0,8)}</td>
                                <td className="p-2">{inv.customerName}</td>
                                <td className="p-2 text-xs text-slate-500 max-w-[150px] truncate">{inv.items?.map(i=>i.name).join(', ')}</td>
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
                        <tr><th>Date</th><th>Category</th><th>Details</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                        {expenses.slice(0,20).map(e => (
                            <tr key={e.id} className="border-b">
                                <td className="p-2">{e.date}</td>
                                <td className="p-2"><Badge>{e.category}</Badge></td>
                                <td className="p-2 text-slate-500">{e.title}</td>
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

// --- MAIN APP COMPONENT ---
const SatikaApp = () => {
  const [user, setUser] = useState(null);
  // We use a loading state for auth check
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data States
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [team, setTeam] = useState([]);

  // Login Form State
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // 1. Firebase Auth & Initial Setup
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth); // Anonymous auth to read DB first
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
       if(u) setUser(u); 
    });
  }, []);

  // 2. Data Fetching (Real-time)
  useEffect(() => {
    if (!user) return;
    
    const unsubTeam = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'team'), s => setTeam(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubInv = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory'), s => setInventory(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubBill = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'invoices'), s => setInvoices(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubExp = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), s => setExpenses(s.docs.map(d => ({id:d.id, ...d.data()}))));

    return () => { unsubTeam(); unsubInv(); unsubBill(); unsubExp(); };
  }, [user]);

  // 3. Login Logic
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if(team.length === 0) {
      // FIRST RUN: Create Admin Automatically
      const adminData = {
        name: "Owner", 
        role: "Owner", 
        userId: loginId.toLowerCase().replace(/\s/g,''), 
        password: loginPass, 
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'team'), adminData);
      setCurrentUser(adminData); // Log in immediately
      alert("Admin Account Created Successfully!");
      return;
    }

    const member = team.find(m => m.userId === loginId.toLowerCase().replace(/\s/g,'') && m.password === loginPass);
    if(member) {
      setCurrentUser(member);
      setLoginId(""); setLoginPass("");
    } else {
      alert("Invalid User ID or Password");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginId(""); setLoginPass("");
    setActiveTab('dashboard');
  };

  // --- RENDER: Login Screen ---
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${BRAND.primary} p-4`}>
        <Card className="w-full max-w-md p-8 animate-fade-in">
          <div className="text-center mb-8">
            <h1 className={`text-4xl font-serif font-bold ${BRAND.primaryText} mb-2`}>SATIKA</h1>
            <p className="text-slate-500 tracking-widest text-sm uppercase">Heritage & Elegance</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase">User ID</label>
               <input className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-[#800020] outline-none" required value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="Enter your ID" />
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
               <input type="password" className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-[#800020] outline-none" required value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" />
             </div>
             <button className={`w-full py-3 rounded-lg text-white font-bold shadow-lg transform active:scale-95 transition-all ${BRAND.gradient}`}>
               {team.length === 0 ? 'Create Admin Account' : 'Login to Dashboard'}
             </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-400">
            Satika ERP v4.0 • Secure Cloud System
          </div>
        </Card>
      </div>
    );
  }

  // --- RENDER: Main Application ---
  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans">
      {/* Sidebar (Desktop) */}
      <div className={`hidden md:flex flex-col w-64 bg-white border-r shadow-lg fixed h-full z-20`}>
        <div className={`p-6 ${BRAND.primary} text-white`}>
          <h1 className="text-2xl font-serif font-bold tracking-wide">SATIKA</h1>
          <p className="text-xs opacity-80">Retail Management</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'billing', icon: ShoppingCart, label: 'POS & Billing' },
            { id: 'inventory', icon: Package, label: 'Inventory' },
            { id: 'expenses', icon: DollarSign, label: 'Expenses' },
            { id: 'reports', icon: FileText, label: 'Reports' },
            { id: 'capital', icon: Coins, label: 'Capital & Equity', adminOnly: true },
            { id: 'team', icon: Users, label: 'Team Access', adminOnly: true },
          ].map(item => (
            (!item.adminOnly || currentUser.role !== 'Worker') && (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id ? `${BRAND.light} ${BRAND.primaryText} font-bold shadow-sm` : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            )
          ))}
        </nav>

        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${BRAND.gradient}`}>
              {currentUser.name[0]}
            </div>
            <div>
              <p className="font-bold text-sm">{currentUser.name}</p>
              <Badge type="maroon">{currentUser.role}</Badge>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-rose-600 text-sm p-2 rounded hover:bg-rose-50 transition-colors">
            Log Out
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b z-30 p-4 flex justify-between items-center shadow-sm">
         <h1 className={`text-xl font-serif font-bold ${BRAND.primaryText}`}>SATIKA</h1>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu className={BRAND.primaryText}/></button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
           <div className="bg-white w-64 h-full p-4" onClick={e => e.stopPropagation()}>
              <div className="mb-6 font-bold text-xl">Menu</div>
              {/* (Same nav items as desktop) */}
              {/* ... simplified for brevity ... */}
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-x-hidden">
        {activeTab === 'dashboard' && <Dashboard inventory={inventory} invoices={invoices} expenses={expenses} setActiveTab={setActiveTab} currentUser={currentUser} />}
        {activeTab === 'team' && <TeamModule user={user} appId={appId} />}
        {activeTab === 'capital' && <CapitalModule user={user} appId={appId} invoices={invoices} expenses={expenses} />}
        {activeTab === 'expenses' && <ExpenseManager expenses={expenses} user={user} appId={appId} />}
        {activeTab === 'inventory' && <InventoryManager inventory={inventory} user={user} appId={appId} />}
        {activeTab === 'billing' && <POSSystem inventory={inventory} user={user} appId={appId} />}
        {activeTab === 'reports' && <ReportsModule invoices={invoices} expenses={expenses} />}
      </main>
    </div>
  );
};

export default SatikaApp;
