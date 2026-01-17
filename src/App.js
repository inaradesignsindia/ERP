import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Search, ShoppingCart, Trash2, Plus, Download, Filter, Package, Truck, Store, User, PieChart as PieIcon, BarChart2, TrendingUp, AlertCircle, Calendar, RefreshCw, X, Menu, Settings, LogOut, ChevronRight, FileText, LayoutDashboard, Database, CreditCard, Wallet, RotateCcw, Upload, Layers, Sun, Moon, Globe, Users, Lock, ArrowRightLeft, Coins, Link, MapPin, Mail, FileDown, ChartBarIcon, Instagram, Facebook, DollarSign, CheckCircle, Sparkles, Send, MessageCircle, Building2, Image as ImageIcon, FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
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


const APP_ID = 'inara-erp-v1';
const COMPANY_ID = 'inara_main_store_01';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyDGXKBZJPBNqvJGGZCQKJxWJON-Ht5KYxs'); // Replace with your API key
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// --- BRANDING ---
const BRAND = {
  primary: "bg-purple-600",
  primaryHover: "hover:bg-purple-700",
  primaryText: "text-purple-700",
  light: "bg-purple-50",
  accent: "text-purple-600",
  gradient: "bg-gradient-to-r from-purple-600 to-purple-800",
  bg: "bg-slate-50",
  card: "glass rounded-3xl shadow-xl shadow-purple-900/5 border border-white/20",
  sidebar: "glass border-r border-gray-100 dark:border-white/5"
};

// --- PDF GENERATOR ---
const generateInvoicePDF = (cart, meta, total, isReturnMode) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleString();

  // Header
  doc.setFillColor(107, 33, 168);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("INARA ERP", 20, 25);
  doc.setFontSize(10);
  doc.text("ELEGANCE & EFFICIENCY", 20, 32);

  // Invoice Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`${isReturnMode ? 'CREDIT NOTE' : 'TAX INVOICE'}`, 20, 55);
  doc.setFontSize(10);
  doc.text(`Date: ${date}`, 20, 62);
  doc.text(`Customer: ${meta.customerName || 'Walk-in'}`, 20, 69);
  doc.text(`Channel: ${meta.channel}`, 20, 76);

  // Table
  const tableRows = cart.map(item => [
    item.name,
    item.qty.toString(),
    `INR ${item.price}`,
    `INR ${item.price * item.qty}`
  ]);

  doc.autoTable({
    startY: 85,
    head: [['Product', 'Qty', 'Price', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [107, 33, 168] },
  });

  // Total
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text(`Total Amount: INR ${Math.abs(total)}`, 140, finalY);

  if (isReturnMode) {
    doc.setFontSize(10);
    doc.setTextColor(200, 0, 0);
    doc.text(`Reason for Return: ${meta.returnReason}`, 20, finalY + 10);
  }

  doc.save(`Inara_${isReturnMode ? 'Return' : 'Invoice'}_${Date.now()}.pdf`);
};

// --- UTILITY COMPONENTS ---
const Card = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`${BRAND.card} p-6 ${className}`}
  >
    {children}
  </motion.div>
);

const Badge = ({ children, type = "default" }) => {
  const styles = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    primary: "bg-purple-100 text-purple-700",
    info: "bg-blue-100 text-blue-700"
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[type] || styles.default}`}>{children}</span>;
};

const Button = ({ children, onClick, variant = "primary", icon: Icon, className = "", disabled = false }) => {
  const variants = {
    primary: `${BRAND.primary} text-white ${BRAND.primaryHover} shadow-lg shadow-purple-600/30`,
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200",
    ghost: "text-gray-500 hover:bg-gray-100",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />}{children}
    </button>
  );
};

const GlobalSearch = ({ isOpen, onClose, inventory, onNavigate }) => {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (!query) return [];
    return inventory.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku?.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }, [query, inventory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm p-4 flex items-start justify-center pt-24">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-purple-100">
        <div className="p-4 border-b flex items-center gap-3">
          <Search size={22} className="text-purple-400" />
          <input autoFocus placeholder="Search products, SKUs, commands..." className="flex-1 outline-none text-lg text-gray-800" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Escape' && onClose()} />
          <div className="px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-lg font-bold">ESC</div>
        </div>
        <div className="max-h-96 overflow-auto">
          {results.length > 0 ? (
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Products</p>
              {results.map(r => (
                <button key={r.id} onClick={() => { onNavigate('inventory'); onClose(); }} className="w-full text-left p-3 hover:bg-purple-50 rounded-xl flex justify-between items-center transition-colors">
                  <div><div className="font-bold text-gray-800">{r.name}</div><div className="text-xs text-gray-500">{r.sku} • {r.location}</div></div>
                  <div className="text-right flex flex-col items-end"><div className="font-bold text-purple-700">₹{r.price}</div><div className="text-xs text-gray-400">{r.quantity} in stock</div></div>
                </button>
              ))}
            </div>
          ) : query && <div className="p-8 text-center text-gray-400 italic">No results found for "{query}"</div>}
          {!query && (
            <div className="p-4 grid grid-cols-2 gap-2">
              <button onClick={() => { onNavigate('billing'); onClose(); }} className="p-4 text-left border rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all flex items-center gap-3 font-medium text-gray-700"><ShoppingCart size={18} className="text-purple-500" /> New Sale</button>
              <button onClick={() => { onNavigate('expenses'); onClose(); }} className="p-4 text-left border rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all flex items-center gap-3 font-medium text-gray-700"><DollarSign size={18} className="text-rose-500" /> Add Expense</button>
              <button onClick={() => { onNavigate('inventory'); onClose(); }} className="p-4 text-left border rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all flex items-center gap-3 font-medium text-gray-700"><Package size={18} className="text-blue-500" /> Inventory</button>
              <button onClick={() => { onNavigate('reports'); onClose(); }} className="p-4 text-left border rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all flex items-center gap-3 font-medium text-gray-700"><FileText size={18} className="text-amber-500" /> View Reports</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- NEW UTILITY COMPONENTS ---
const Toast = ({ message, type = "success", onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.5 }}
    className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl glass ${type === 'success' ? 'border-emerald-500/50' : 'border-rose-500/50'}`}
  >
    <div className={`p-2 rounded-full ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
      {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
    </div>
    <div className="flex-1">
      <p className="font-bold text-gray-800 text-sm leading-tight">{message}</p>
    </div>
    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} /></button>
  </motion.div>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-purple-100/50 rounded-xl ${className}`}></div>
);

const ProgressBar = ({ value, max = 100, color = "bg-purple-600" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={`h-full ${color} transition-all duration-500`} />
    </div>
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

// --- 1. DASHBOARD ---
const Dashboard = ({ inventory, invoices, expenses, currentUser, showToast }) => {
  const [timeFilter, setTimeFilter] = useState('month');

  const filteredData = useMemo(() => {
    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    let daysToSubtract = 30;
    if (timeFilter === 'week') daysToSubtract = 7;
    if (timeFilter === '3months') daysToSubtract = 90;
    if (timeFilter === '6months') daysToSubtract = 180;
    if (timeFilter === 'year') daysToSubtract = 365;

    const cutoff = now.getTime() - (daysToSubtract * msInDay);
    return {
      invoices: invoices.filter(inv => new Date(inv.date).getTime() >= cutoff && inv.status !== 'Returned'),
      expenses: expenses.filter(exp => (exp.date ? new Date(exp.date).getTime() : 0) >= cutoff)
    };
  }, [invoices, expenses, timeFilter]);

  const metrics = useMemo(() => {
    let sales = 0, costOfGoods = 0, expenseTotal = 0;
    let channelData = { Store: 0, Instagram: 0, Facebook: 0, Website: 0 };

    filteredData.invoices.forEach(inv => {
      sales += parseFloat(inv.total || 0);
      costOfGoods += inv.items?.reduce((c, i) => c + ((i.cost || i.price * 0.7) * i.qty), 0) || 0;
      const channel = inv.channel || 'Store';
      channelData[channel] = (channelData[channel] || 0) + parseFloat(inv.total || 0);
    });

    filteredData.expenses.forEach(e => expenseTotal += parseFloat(e.amount || 0));

    // Chart Data Preparation
    const chartData = filteredData.invoices.reduce((acc, inv) => {
      const date = new Date(inv.date).toLocaleDateString();
      const existing = acc.find(d => d.date === date);
      if (existing) existing.revenue += parseFloat(inv.total);
      else acc.push({ date, revenue: parseFloat(inv.total) });
      return acc;
    }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Expense Pie Data
    const expensePieData = Object.entries(filteredData.expenses.reduce((acc, curr) => {
      const cat = curr.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + parseFloat(curr.amount || 0);
      return acc;
    }, {})).map(([name, value]) => ({ name, value }));

    // Top Selling Items
    const productSales = {};
    filteredData.invoices.forEach(inv => {
      inv.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.qty;
      });
    });
    const topSellingItems = Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Receivables (assuming unpaid invoices if we track them, currently tracking all for demo)
    // For now, let's simulate "Receivables" as recent invoices (last 7 days) that are technically "Due"
    // real implementation needs 'status' field update
    const receivables = filteredData.invoices.filter(i => i.status === 'Pending' || i.status === 'Due').reduce((sum, i) => sum + i.total, 0);

    const totalItems = inventory.reduce((a, b) => a + (b.quantity || 0), 0);
    const skuCount = inventory.length;

    return { sales, profit: sales - costOfGoods - expenseTotal, expenseTotal, channelData, chartData, totalItems, skuCount, expensePieData, topSellingItems, receivables };
  }, [filteredData, inventory]);

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Welcome, {currentUser?.name}</h2>
          <p className="text-gray-500 mt-1">Performance overview for: <span className="font-semibold capitalize text-purple-600">{timeFilter}</span></p>
        </div>
        <div className="flex bg-white/50 dark:bg-slate-800/50 rounded-xl border p-1 shadow-sm overflow-x-auto">
          {['week', 'month', '3months', '6months', 'year'].map(t => (
            <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-2 text-[10px] md:text-sm rounded-lg transition-all font-bold whitespace-nowrap capitalize ${timeFilter === t ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-white dark:hover:bg-slate-700'}`}>
              {t === '3months' ? 'Quarter' : t === '6months' ? 'Half-Year' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {inventory.length === 0 ? (
          [1, 2, 3, 4].map(i => <Card key={i}><Skeleton className="h-24" /></Card>)
        ) : (
          <>
            <Card className="p-6 bg-purple-600 dark:bg-purple-500 text-white border-none shadow-xl shadow-purple-200 dark:shadow-none animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-purple-100 text-sm font-bold mb-1">Total Revenue</p>
                  <h3 className="text-3xl font-black">₹{metrics.sales.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-white/20 rounded-xl"><TrendingUp size={24} className="text-white" /></div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-amber-500 animate-fade-in delay-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Receivables (Due)</p>
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white">₹{metrics.receivables?.toLocaleString() || '0'}</h3>
                  <div className="text-[10px] text-amber-600 font-bold mt-1">Pending Payments</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl"><Coins size={24} className="text-amber-500" /></div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-emerald-500 animate-fade-in delay-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Profits</p>
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white">₹{metrics.profit.toLocaleString()}</h3>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">Net Income</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl"><Wallet size={24} className="text-emerald-500" /></div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-blue-500 animate-fade-in delay-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Expenses</p>
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white">₹{metrics.expenseTotal.toLocaleString()}</h3>
                  <div className="text-[10px] text-blue-600 font-bold mt-1">Operating Costs</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl"><CreditCard size={24} className="text-blue-500" /></div>
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-white border-amber-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Low Stock</p>
                  <h3 className="text-3xl font-bold text-amber-600">{inventory.filter(i => i.quantity < 5).length}</h3>
                </div>
                <AlertCircle className="text-amber-400" size={24} />
              </div>
              <div className="mt-4"><Badge type="warning">Needs Restock</Badge></div>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-1 lg:col-span-3 min-h-[400px]">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">Revenue Trend</h3>
            <div className="flex gap-2 text-xs font-medium">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Sales</span>
            </div>
          </div>
          <div className="p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-1 lg:col-span-2 min-h-[400px]">
          <div className="p-6 border-b"><h3 className="font-bold text-gray-800 text-lg">Expense Breakdown</h3></div>
          <div className="p-6 h-80 flex items-center justify-center">
            {metrics.expensePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.expensePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {metrics.expensePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#6366f1', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981'][index % 5]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-gray-400 italic">No expense data</div>}
          </div>
        </Card>

        <Card className="col-span-1 lg:col-span-2 min-h-[400px]">
          <div className="p-6 border-b"><h3 className="font-bold text-gray-800 text-lg">Top Selling Items</h3></div>
          <div className="p-6 space-y-4">
            {metrics.topSellingItems.length > 0 ? metrics.topSellingItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>#{idx + 1}</div>
                  <div className="font-bold text-gray-800">{item.name}</div>
                </div>
                <div className="text-sm font-bold text-purple-600">{item.qty} sold</div>
              </div>
            )) : <div className="text-gray-400 italic">No sales data yet</div>}
          </div>
        </Card>
        <Card className="lg:col-span-1">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><PieChart size={20} className="text-purple-600" /> Sales Channels</h3>
          <div className="space-y-5">
            {Object.entries(metrics.channelData).map(([channel, amount]) => (
              <div key={channel}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{channel}</span>
                  <span className="font-bold text-gray-900">₹{amount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.sales > 0 ? (amount / metrics.sales) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-2.5 rounded-full bg-purple-600"
                  ></motion.div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="lg:col-span-2">
        <h3 className="font-bold text-gray-800 mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {invoices.slice(0, 5).map(inv => (
            <div key={inv.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${inv.status === 'Returned' ? 'bg-rose-100 text-rose-600' : 'bg-purple-100 text-purple-600'}`}>
                  {inv.status === 'Returned' ? <RotateCcw size={18} /> : <CheckCircle size={18} />}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{inv.customerName || 'Walk-in'} <span className="text-xs font-normal text-gray-400 ml-1">via {inv.channel}</span></p>
                  <p className="text-xs text-gray-500">{new Date(inv.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${inv.status === 'Returned' ? 'text-rose-600 line-through' : 'text-gray-800'}`}>₹{inv.total}</div>
                <div className="text-xs text-gray-400 capitalize">{inv.status}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// --- 2. PARTIES & OUTLETS ---
const PartiesModule = () => {
  const [outlets, setOutlets] = useState([]);
  const [parties, setParties] = useState([]);
  const [newOutlet, setNewOutlet] = useState({ name: '', type: 'Store' });
  const [newParty, setNewParty] = useState({ name: '', type: 'Vendor', contact: '' });

  useEffect(() => {
    const unsubOut = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'outlets'), s => setOutlets(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubParties = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'parties'), s => setParties(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubOut(); unsubParties(); };
  }, []);

  const addOutlet = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'outlets'), newOutlet); setNewOutlet({ name: '', type: 'Store' }); };
  const addParty = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'parties'), newParty); setNewParty({ name: '', type: 'Vendor', contact: '' }); };
  const handleDelete = async (coll, id) => { if (window.confirm("Delete?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, coll, id)); }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Parties, Vendors & Outlets</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2 text-purple-700"><Store size={20} /> Sales Channels</h3>
          <Card>
            <form onSubmit={addOutlet} className="flex gap-3">
              <input className="flex-1 p-3 border rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-purple-200" placeholder="Outlet Name" value={newOutlet.name} onChange={e => setNewOutlet({ ...newOutlet, name: e.target.value })} required />
              <select className="p-3 border rounded-xl bg-gray-50 outline-none" value={newOutlet.type} onChange={e => setNewOutlet({ ...newOutlet, type: e.target.value })}><option>Store</option><option>Warehouse</option><option>Online</option></select>
              <Button>Add</Button>
            </form>
          </Card>
          <div className="space-y-3">{outlets.map(o => <div key={o.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div><div className="font-bold text-gray-800">{o.name}</div><div className="text-xs text-gray-500">{o.type}</div></div><button onClick={() => handleDelete('outlets', o.id)} className="text-gray-400 hover:text-rose-600"><Trash2 size={18} /></button></div>)}</div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2 text-purple-700"><Truck size={20} /> Vendors & Parties</h3>
          <Card>
            <form onSubmit={addParty} className="space-y-3">
              <div className="flex gap-3"><input className="flex-1 p-3 border rounded-xl bg-gray-50" placeholder="Name" value={newParty.name} onChange={e => setNewParty({ ...newParty, name: e.target.value })} required /><select className="p-3 border rounded-xl bg-gray-50" value={newParty.type} onChange={e => setNewParty({ ...newParty, type: e.target.value })}><option>Vendor</option><option>Customer</option><option>Owner</option><option>Manager</option></select></div>
              <div className="flex gap-3"><input className="flex-1 p-3 border rounded-xl bg-gray-50" placeholder="Contact Info" value={newParty.contact} onChange={e => setNewParty({ ...newParty, contact: e.target.value })} /><Button>Add</Button></div>
            </form>
          </Card>
          <div className="space-y-3">{parties.map(p => <div key={p.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div><div className="font-bold text-gray-800">{p.name}</div><div className="text-xs text-gray-500">{p.type} • {p.contact}</div></div><button onClick={() => handleDelete('parties', p.id)} className="text-gray-400 hover:text-rose-600"><Trash2 size={18} /></button></div>)}</div>
        </div>
      </div>
    </div>
  );
};

// --- 3. INVENTORY ---
const InventoryManager = ({ inventory, outlets, showToast, parties }) => {
  const [item, setItem] = useState({
    name: "", sku: "", description: "", quantity: 0,
    price: 0, category: "Saree", location: "Main Store",
    purchasePrice_no_gst: 0, purchase_gst: 0,
    salePrice_no_gst: 0, sale_gst: 0, mrp: 0, vendor: ""
  });
  const [showBulk, setShowBulk] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [search, setSearch] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory'), {
      ...item,
      quantity: parseInt(item.quantity) || 0,
      price: parseFloat(item.price) || 0,
      purchasePrice_no_gst: parseFloat(item.purchasePrice_no_gst) || 0,
      purchase_gst: parseFloat(item.purchase_gst) || 0,
      salePrice_no_gst: parseFloat(item.salePrice_no_gst) || 0,
      sale_gst: parseFloat(item.sale_gst) || 0,
      mrp: parseFloat(item.mrp) || 0,
      createdAt: serverTimestamp()
    });

    // Audit Log
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'audit_log'), {
      itemId: docRef.id, itemName: item.name, type: 'Inward', qty: parseInt(item.quantity), date: new Date().toISOString(), user: 'Admin'
    });

    showToast(`${item.name} added to inventory`);
    setItem({
      name: "", sku: "", description: "", quantity: 0,
      price: 0, category: "Saree", location: "Main Store",
      purchasePrice_no_gst: 0, purchase_gst: 0,
      salePrice_no_gst: 0, sale_gst: 0, mrp: 0, vendor: ""
    });
  };

  const handleBulkUpload = async () => {
    const lines = bulkData.trim().split('\n');
    let count = 0; const batch = writeBatch(db);
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];
      const [name, sku, quantity, price, loc] = line.split(',');
      if (name && price) {
        const ref = doc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory'));
        batch.set(ref, {
          name: name.trim(), sku: sku?.trim() || `SKU-${Math.floor(Math.random() * 1000)}`,
          quantity: parseInt(quantity) || 0, price: parseFloat(price) || 0,
          cost: parseFloat(price) * 0.7 || 0, location: loc?.trim() || "Main Warehouse", createdAt: serverTimestamp()
        });
        count++;
      }
    }
    await batch.commit(); setShowBulk(false); setBulkData(""); alert(`Uploaded ${count} items!`);
  };

  const handleDelete = async (id) => { if (window.confirm("Delete?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory', id)); };
  const filtered = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
        <Button variant="secondary" onClick={() => setShowBulk(true)} icon={Upload}>Bulk Import</Button>
      </div>

      <Card>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Item Name</label><input placeholder="Silk Saree X" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" required value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">SKU</label><input placeholder="INV-001" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" value={item.sku} onChange={e => setItem({ ...item, sku: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Category</label><select className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" value={item.category} onChange={e => setItem({ ...item, category: e.target.value })}><option>Saree</option><option>Suit</option><option>Kurti</option><option>Fabric</option><option>Accessories</option></select></div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Quantity</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" required value={item.quantity} onChange={e => setItem({ ...item, quantity: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Purchase Price (No GST)</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" value={item.purchasePrice_no_gst} onChange={e => setItem({ ...item, purchasePrice_no_gst: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Purchase GST (%)</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" value={item.purchase_gst} onChange={e => setItem({ ...item, purchase_gst: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Vendor</label><select className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" value={item.vendor} onChange={e => setItem({ ...item, vendor: e.target.value })}><option value="">Select Vendor</option>{parties?.filter(p => p.type === 'Vendor').map(v => <option key={v.id} value={v.name}>{v.name}</option>)}</select></div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Sale Price (No GST)</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" value={item.salePrice_no_gst} onChange={e => setItem({ ...item, salePrice_no_gst: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Sale GST (%)</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" value={item.sale_gst} onChange={e => setItem({ ...item, sale_gst: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Sale MRP</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" value={item.mrp} onChange={e => setItem({ ...item, mrp: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Final Checkout Price</label><input type="number" className="w-full p-3 border rounded-xl bg-purple-50 dark:bg-purple-900/20 font-bold border-purple-200" required value={item.price} onChange={e => setItem({ ...item, price: e.target.value })} /></div>
          </div>

          <div className="flex gap-4">
            <textarea placeholder="Description" className="flex-1 p-3 border rounded-xl bg-gray-50 dark:bg-slate-800" rows="1" value={item.description} onChange={e => setItem({ ...item, description: e.target.value })} />
            <Button className="px-10">Add Item</Button>
          </div>
        </form>
      </Card>

      {showBulk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg h-96 flex flex-col relative">
            <div className="flex justify-between mb-4 font-bold text-lg"><span>Bulk Upload (CSV)</span><button onClick={() => setShowBulk(false)}><X /></button></div>
            <p className="text-xs text-gray-500 mb-2">Format: Name, SKU, Quantity, Price, Location</p>
            <textarea className="flex-1 border p-4 rounded-xl bg-gray-50 font-mono text-sm" placeholder={`Silk Saree, SKU-99, 10, 2500, Shelf A\nCotton Suit, SKU-100, 5, 1200, Shelf B`} value={bulkData} onChange={e => setBulkData(e.target.value)}></textarea>
            <Button className="mt-4" onClick={handleBulkUpload}>Process Upload</Button>
          </Card>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input className="w-full pl-12 p-3 border rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 italic">
              <tr>
                <th className="p-4 font-bold text-gray-600">Item Details</th>
                <th className="p-4 font-bold text-gray-600">Purchase (Base/GST)</th>
                <th className="p-4 font-bold text-gray-600">Sale (Base/GST)</th>
                <th className="p-4 font-bold text-gray-600">Performance</th>
                <th className="p-4 font-bold text-gray-600 text-right">Price / MRP</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-purple-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-800 dark:text-gray-200">{i.name}</div>
                    <div className="text-[10px] text-purple-600 font-black">{i.sku || 'NO-SKU'}</div>
                    <div className="text-[10px] text-gray-400 italic line-clamp-1">{i.description}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300">₹{i.purchasePrice_no_gst || 0}</div>
                    <div className="text-[10px] text-gray-400">GST: {i.purchase_gst || 0}%</div>
                    <div className="text-[10px] text-purple-500 font-bold">{i.vendor}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300">₹{i.salePrice_no_gst || 0}</div>
                    <div className="text-[10px] text-gray-400">GST: {i.sale_gst || 0}%</div>
                    <div className="text-[10px] text-emerald-600 font-bold">{i.category}</div>
                  </td>
                  <td className="p-4 w-48">
                    <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                      <span className={i.quantity < 5 ? 'text-rose-600' : 'text-purple-700'}>{i.quantity} units</span>
                      <span className="text-gray-400 capitalize">{i.location}</span>
                    </div>
                    <ProgressBar value={i.quantity} max={50} color={i.quantity < 10 ? "bg-rose-500" : "bg-purple-500"} />
                  </td>
                  <td className="p-4 text-right">
                    <div className="font-bold text-purple-700 dark:text-purple-400">₹{i.price}</div>
                    <div className="text-[10px] text-gray-400 line-through">MRP: ₹{i.mrp || 0}</div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDelete(i.id)} className="p-2 hover:bg-rose-50 rounded-lg text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map(i => (
            <div key={i.id} className="p-4 flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-800">{i.name}</div>
                <div className="text-xs text-gray-500">{i.category} • {i.location}</div>
                <div className="mt-1"><Badge type={i.quantity < 5 ? 'danger' : 'success'}>{i.quantity} {i.uom} left</Badge></div>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-700">₹{i.price}</div>
                <button onClick={() => handleDelete(i.id)} className="mt-2 text-gray-400"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 3.5 PROCUREMENT MODULE ---
const ProcurementModule = ({ inventory, showToast, parties }) => {
  const [items, setItems] = useState([{ name: '', qty: 0, cost: 0 }]);
  const [vendor, setVendor] = useState("");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    return onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'procurement'), s => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleCreatePO = async () => {
    if (!vendor || items.some(i => !i.name || i.qty <= 0)) return showToast("Please fill all fields", "error");
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'procurement'), {
      vendor, items, status: 'Ordered', date: new Date().toISOString(), total: items.reduce((sum, i) => sum + (i.qty * i.cost), 0)
    });
    setVendor(""); setItems([{ name: '', qty: 0, cost: 0 }]);
    showToast("Purchase Order Created");
  };

  const markReceived = async (order) => {
    const batch = writeBatch(db);
    order.items.forEach(item => {
      const existing = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        batch.update(doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory', existing.id), { quantity: existing.quantity + parseInt(item.qty) });
      }
    });
    batch.update(doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'procurement', order.id), { status: 'Received' });
    await batch.commit();
    showToast("Stock Inward Completed");
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-xl font-bold mb-4">Create Purchase Order</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <select className="w-full p-3 border rounded-xl" value={vendor} onChange={e => setVendor(e.target.value)}>
            <option value="">Select Vendor</option>
            {parties.filter(p => p.type === 'Vendor').map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <div className="flex gap-2"><Button variant="ghost" icon={Plus} onClick={() => setItems([...items, { name: '', qty: 0, cost: 0 }])} className="flex-1">Add Product</Button></div>
        </div>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-3 p-3 bg-gray-50 rounded-xl">
              <input placeholder="Item Name" className="flex-[2] p-3 border rounded-xl" value={it.name} onChange={e => { const n = [...items]; n[idx].name = e.target.value; setItems(n); }} />
              <input type="number" placeholder="Qty" className="flex-1 p-3 border rounded-xl" value={it.qty} onChange={e => { const n = [...items]; n[idx].qty = parseInt(e.target.value); setItems(n); }} />
              <input type="number" placeholder="Unit Cost" className="flex-1 p-3 border rounded-xl" value={it.cost} onChange={e => { const n = [...items]; n[idx].cost = parseFloat(e.target.value); setItems(n); }} />
              <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-3 text-rose-500"><X /></button>
            </div>
          ))}
          <Button onClick={handleCreatePO} className="w-full mt-4">Initiate Procurement</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {orders.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(o => (
          <Card key={o.id} className="border-l-4 border-purple-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-lg">{o.vendor}</h4>
                <p className="text-xs text-gray-400">{new Date(o.date).toLocaleDateString()}</p>
              </div>
              <Badge type={o.status === 'Received' ? 'success' : 'warning'}>{o.status}</Badge>
            </div>
            <div className="space-y-1 mb-4 max-h-32 overflow-auto">
              {o.items.map((it, i) => <div key={i} className="text-sm flex justify-between"><span>{it.name}</span> <span className="font-bold">x{it.qty} @ ₹{it.cost}</span></div>)}
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="font-bold text-purple-700 text-lg">₹{o.total?.toLocaleString()}</span>
              {o.status === 'Ordered' && <Button size="sm" onClick={() => markReceived(o)}>Mark Received</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- 4. BILLING & SALES ---
const BillingSales = ({ inventory, showToast, parties, invoices }) => {
  const [cart, setCart] = useState([]);
  const [meta, setMeta] = useState({ customerName: '', channel: 'Store', returnReason: '', customerId: '', billNumber: '' });
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [search, setSearch] = useState("");
  const [valBill, setValBill] = useState("");
  const [originalBill, setOriginalBill] = useState(null);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  const handleTransaction = async () => {
    if (!cart.length) return alert("Cart is empty");
    const batch = writeBatch(db);
    const billNum = isReturnMode ? meta.billNumber : `INV-${Date.now().toString().slice(-6)}`;

    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'invoices'), {
      ...meta, billNumber: billNum, items: cart, subtotal, tax, total,
      date: new Date().toISOString(), status: 'Paid', isReturn: isReturnMode
    });

    if (meta.customerId) {
      const customer = parties.find(p => p.id === meta.customerId);
      if (customer) {
        const points = Math.floor(total / 100);
        batch.update(doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'parties', meta.customerId), {
          loyaltyPoints: (customer.loyaltyPoints || 0) + points,
          totalSpent: (customer.totalSpent || 0) + total
        });
      }
    }

    cart.forEach(item => {
      const ref = doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory', item.id);
      const currentQty = inventory.find(i => i.id === item.id)?.quantity || 0;
      const newQty = isReturnMode ? currentQty + item.qty : currentQty - item.qty;
      batch.update(ref, { quantity: newQty });

      batch.set(doc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'audit_log')), {
        itemId: item.id, itemName: item.name, type: isReturnMode ? 'Return' : 'Sale',
        qty: item.qty, date: new Date().toISOString(), user: 'Admin'
      });
    });

    showToast(isReturnMode ? "Return processed successfully" : `Sale completed! Bill: ${billNum}`);
    await batch.commit();
    setCart([]); setMeta({ customerName: '', channel: 'Store', returnReason: '', customerId: '', billNumber: '' });
    setOriginalBill(null); setValBill("");
  };

  const validateBill = () => {
    const bill = invoices.find(inv => inv.billNumber === valBill);
    if (!bill) return showToast("Invalid Bill Number", "error");
    setOriginalBill(bill);
    setCart(bill.items);
    setMeta({ ...meta, customerName: bill.customerName, customerId: bill.customerId, billNumber: bill.billNumber });
  };

  const customers = parties.filter(p => p.type === 'Customer');

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
      <div className="flex-1 flex flex-col gap-6">
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {!isReturnMode ? (
              <div className="relative flex-1 text-slate-800"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input className="w-full pl-12 p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none dark:bg-slate-800 dark:text-white" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            ) : (
              <div className="flex-1 flex gap-2">
                <input className="flex-1 p-3 border rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-200" placeholder="Enter Bill Number (e.g. INV-123456)" value={valBill} onChange={e => setValBill(e.target.value)} />
                <Button onClick={validateBill} variant="secondary">Validate Bill</Button>
              </div>
            )}
            <button onClick={() => { setIsReturnMode(!isReturnMode); setCart([]); setOriginalBill(null); }} className={`px-6 py-3 rounded-xl font-bold transition-all ${isReturnMode ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}`}>{isReturnMode ? 'Return Mode' : 'Sales Mode'}</button>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-auto pb-10">
          {inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase())).map(i => (
            <button key={i.id} onClick={() => {
              const existing = cart.find(c => c.id === i.id);
              if (existing) setCart(cart.map(c => c.id === i.id ? { ...c, qty: c.qty + 1 } : c));
              else setCart([...cart, { ...i, qty: 1 }]);
            }} className="p-4 text-left glass-dark rounded-2xl hover:scale-[1.02] transition-all border border-purple-100/50">
              <div className="font-bold text-gray-800">{i.name}</div>
              <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">{i.sku || 'N/A'}</div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-700">₹{i.price}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${i.quantity < 5 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{i.quantity} left</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-96 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg">{isReturnMode ? 'Return Session' : 'Sales Session'}</h3>
            <span className={`text-[10px] ${isReturnMode ? 'bg-rose-100 text-rose-700' : 'bg-purple-100 text-purple-700'} px-2 py-1 rounded-lg font-bold uppercase`}>{isReturnMode ? 'Return' : 'POS #1'}</span>
          </div>

          <div className="p-4 flex-1 overflow-auto space-y-3">
            <div className="mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Customer</label>
              <select className="w-full p-2.5 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200" value={meta.customerId} onChange={e => {
                const c = customers.find(p => p.id === e.target.value);
                setMeta({ ...meta, customerId: e.target.value, customerName: c?.name || '' });
              }}>
                <option value="">Guest Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.loyaltyPoints || 0} pts)</option>)}
              </select>
            </div>

            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center p-2.5 bg-gray-50/50 rounded-xl group transition-all hover:bg-white hover:shadow-sm">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm font-bold text-gray-800 truncate">{item.name}</div>
                  <div className="text-[10px] text-gray-500">₹{item.price} x {item.qty}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-gray-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                  <div className="font-bold text-gray-900 text-sm">₹{item.price * item.qty}</div>
                </div>
              </div>
            ))}
            {!cart.length && <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20"><ShoppingCart size={40} className="mb-2 opacity-10" /><p className="text-sm">Empty Cart</p></div>}
          </div>

          <div className="p-6 bg-gray-900 text-white rounded-b-2xl space-y-3">
            <div className="flex justify-between text-xs text-gray-400 font-medium"><span>Subtotal</span> <span>₹{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs text-gray-400 font-medium"><span>GST (12%)</span> <span>₹{tax.toLocaleString()}</span></div>
            <div className="flex justify-between text-2xl font-black text-white pt-2 border-t border-white/10"><span>Total</span> <span>₹{total.toLocaleString()}</span></div>
            <Button className={`w-full py-4 mt-2 border-0 ${isReturnMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'}`} onClick={handleTransaction} disabled={isReturnMode && !originalBill}>
              {isReturnMode ? 'Confirm Return' : 'Complete Checkout'}
            </Button>
          </div>
        </Card>

        {isReturnMode && (
          <Card className="p-4 bg-purple-50 dark:bg-purple-900/10 border-purple-200">
            <h4 className="text-[10px] font-bold text-purple-700 uppercase mb-2">Recent Bills (Ref)</h4>
            <div className="space-y-1 max-h-32 overflow-auto">
              {invoices.slice(0, 5).map(inv => (
                <div key={inv.id} className="text-[10px] flex justify-between">
                  <span className="font-mono">{inv.billNumber}</span>
                  <span className="text-gray-500">₹{inv.total}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// --- 5. EXPENSE MANAGER ---
const ExpenseManager = ({ expenses, outlets, parties, showToast }) => {
  const [newExp, setNewExp] = useState({ title: '', amount: '', category: 'Rent', date: new Date().toISOString().split('T')[0], frequency: 'One-time', assignTo: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'expenses'), { ...newExp, amount: parseFloat(newExp.amount), createdAt: serverTimestamp() });
    showToast("Expense recorded");
    setNewExp({ title: '', amount: '', category: 'Rent', date: new Date().toISOString().split('T')[0], frequency: 'One-time', assignTo: '' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Expense Tracker</h2>
      <Card>
        <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="col-span-2"><label className="text-xs font-bold text-gray-500 mb-1 block">Description</label><input className="w-full p-3 border rounded-xl bg-gray-50" value={newExp.title} onChange={e => setNewExp({ ...newExp, title: e.target.value })} /></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">Amount</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50" value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} /></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">Category</label><select className="w-full p-3 border rounded-xl bg-gray-50" value={newExp.category} onChange={e => setNewExp({ ...newExp, category: e.target.value })}><option>Rent</option><option>Salaries</option><option>Utilities</option><option>Stock</option><option>Marketing</option></select></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">Frequency</label><select className="w-full p-3 border rounded-xl bg-gray-50" value={newExp.frequency} onChange={e => setNewExp({ ...newExp, frequency: e.target.value })}><option>One-time</option><option>Recurring</option></select></div>
          <div className="col-span-2"><label className="text-xs font-bold text-gray-500 mb-1 block">Assign to</label><select className="w-full p-3 border rounded-xl bg-gray-50" value={newExp.assignTo} onChange={e => setNewExp({ ...newExp, assignTo: e.target.value })}><option value="">-- Select Entity --</option><optgroup label="Outlets">{outlets.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}</optgroup><optgroup label="Vendors">{parties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</optgroup></select></div>
          <Button>Save Expense</Button>
        </form>
      </Card>
      <div className="overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-4 font-bold text-gray-600">Date</th><th className="p-4 font-bold text-gray-600">Desc</th><th className="p-4 font-bold text-gray-600">Assigned</th><th className="p-4 font-bold text-gray-600 text-right">Amt</th></tr></thead><tbody className="divide-y divide-gray-100">{expenses.map(e => <tr key={e.id} className="hover:bg-gray-50"><td className="p-4">{e.date}</td><td className="p-4">{e.title} <Badge>{e.category}</Badge></td><td className="p-4 text-xs text-gray-500">{e.assignTo}</td><td className="p-4 font-bold text-rose-600 text-right">₹{e.amount}</td></tr>)}</tbody></table></div>
    </div>
  );
};

// --- 6. ESTIMATES/QUOTES MODULE ---
const EstimatesModule = ({ inventory, parties, showToast }) => {
  const [estimates, setEstimates] = useState([]);
  const [cart, setCart] = useState([]);
  const [meta, setMeta] = useState({ customerName: '', validUntil: '', notes: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'estimates'), s => setEstimates(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    else setCart([...cart, { ...item, qty: 1 }]);
  };

  const handleCreateEstimate = async () => {
    if (cart.length === 0) return showToast('Add items to estimate', 'error');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.12;
    const total = subtotal + tax;
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'estimates'), {
      items: cart, ...meta, subtotal, tax, total, status: 'Draft', date: new Date().toISOString(), createdAt: serverTimestamp()
    });
    showToast('Estimate created');
    setCart([]);
    setMeta({ customerName: '', validUntil: '', notes: '' });
  };

  const convertToInvoice = async (estimate) => {
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'invoices'), {
      ...estimate, status: 'Sent', billNumber: `INV-${Date.now()}`, estimateId: estimate.id, date: new Date().toISOString()
    });
    showToast('Converted to Invoice');
  };

  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Estimates & Quotes</h2>
        <Badge className="bg-purple-100 text-purple-700">Pre-Sale Documents</Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4"><input type="text" placeholder="Search products..." className="w-full p-3 border rounded-xl dark:bg-slate-800" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></Card>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredInventory.slice(0, 12).map(item => (
              <Card key={item.id} onClick={() => addToCart(item)} className="p-4 cursor-pointer hover:shadow-lg transition-all">
                <h4 className="font-bold text-gray-800 dark:text-white">{item.name}</h4>
                <p className="text-xs text-gray-500">{item.sku}</p>
                <p className="text-lg font-bold text-purple-600 mt-2">₹{item.price}</p>
              </Card>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-bold mb-4">Estimate Details</h3>
            <input type="text" placeholder="Customer Name" className="w-full p-2 border rounded-lg mb-2 dark:bg-slate-800" value={meta.customerName} onChange={e => setMeta({ ...meta, customerName: e.target.value })} />
            <input type="date" className="w-full p-2 border rounded-lg mb-2 dark:bg-slate-800" value={meta.validUntil} onChange={e => setMeta({ ...meta, validUntil: e.target.value })} />
            <textarea placeholder="Notes" className="w-full p-2 border rounded-lg dark:bg-slate-800" value={meta.notes} onChange={e => setMeta({ ...meta, notes: e.target.value })} />
          </Card>
          <Card className="p-4">
            <h3 className="font-bold mb-4">Cart ({cart.length})</h3>
            {cart.map(item => <div key={item.id} className="flex justify-between mb-2 text-sm"><span>{item.name} x{item.qty}</span><span>₹{item.price * item.qty}</span></div>)}
            <Button className="w-full mt-4 py-3" onClick={handleCreateEstimate}>Create Estimate</Button>
          </Card>
        </div>
      </div>
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Recent Estimates</h3>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b"><th className="text-left p-2">Customer</th><th className="text-left p-2">Date</th><th className="text-left p-2">Total</th><th className="text-left p-2">Status</th><th className="text-left p-2">Actions</th></tr></thead><tbody>
          {estimates.map(est => (
            <tr key={est.id} className="border-b">
              <td className="p-2">{est.customerName}</td>
              <td className="p-2">{new Date(est.date).toLocaleDateString()}</td>
              <td className="p-2 font-bold">₹{est.total}</td>
              <td className="p-2"><Badge className={est.status === 'Converted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{est.status}</Badge></td>
              <td className="p-2">{est.status !== 'Converted' && <Button onClick={() => convertToInvoice(est)} className="px-3 py-1 text-xs">Convert to Invoice</Button>}</td>
            </tr>
          ))}
        </tbody></table></div>
      </Card>
    </div>
  );
};

// --- 7. ORGANIZATION PROFILE ---
const OrganizationProfile = ({ showToast }) => {
  const [profile, setProfile] = useState({ companyName: 'INARA Designs', address: '', taxId: '', email: '', phone: '', logo: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'settings'), s => {
      if (s.docs.length > 0) setProfile({ ...profile, ...s.docs[0].data() });
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'settings'), { ...profile, updatedAt: serverTimestamp() });
    showToast('Organization profile updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 size={32} className="text-purple-600" />
        <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Organization Profile</h2><p className="text-sm text-gray-500">Company information displayed on invoices</p></div>
      </div>
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">Company Name</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800" value={profile.companyName} onChange={e => setProfile({ ...profile, companyName: e.target.value })} /></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">Tax ID / GST Number</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800" value={profile.taxId} onChange={e => setProfile({ ...profile, taxId: e.target.value })} /></div>
          <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 mb-1 block">Address</label><textarea className="w-full p-3 border rounded-xl dark:bg-slate-800" rows="3" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} /></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">Email</label><input type="email" className="w-full p-3 border rounded-xl dark:bg-slate-800" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">Phone</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
          <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 mb-1 block">Company Logo URL</label><input className="w-full p-3 border rounded-xl dark:bg-slate-800" placeholder="https://..." value={profile.logo} onChange={e => setProfile({ ...profile, logo: e.target.value })} /></div>
        </div>
        <Button onClick={handleSave} className="mt-6">Save Profile</Button>
      </Card>
    </div>
  );
};

// --- 8. AI ASSISTANT ---
const AIAssistant = ({ inventory, invoices, expenses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateContext = () => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const lowStockItems = inventory.filter(i => i.quantity < 5);
    const topProducts = inventory.sort((a, b) => (b.quantity || 0) - (a.quantity || 0)).slice(0, 5);

    return `You are Inara AI, an intelligent assistant for INARA ERP system. Current business data:
- Total Revenue: ₹${totalRevenue.toLocaleString()}
- Total Expenses: ₹${totalExpenses.toLocaleString()}
- Net Profit: ₹${(totalRevenue - totalExpenses).toLocaleString()}
- Total Inventory Items: ${inventory.length}
- Low Stock Items (< 5 units): ${lowStockItems.length} items
- Top 5 Products by Stock: ${topProducts.map(p => p.name).join(', ')}
- Total Invoices: ${invoices.length}

Answer questions about sales, inventory, expenses, and provide business insights. Be concise and actionable.`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = generateContext();
      const prompt = `${context}\n\nUser Question: ${input}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiMessage = { role: 'assistant', content: response.text() };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setIsLoading(false);
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[500px] glass rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-purple-200"
          >
            <div className="p-4 bg-gradient-to-r from-purple-600 to-purple-800 text-white flex items-center gap-3">
              <Sparkles size={24} />
              <div className="flex-1"><h3 className="font-bold">Inara AI Assistant</h3><p className="text-xs text-purple-100">Powered by Google Gemini</p></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircle size={48} className="mx-auto mb-4 text-purple-300" />
                  <p className="text-sm">Ask me about your sales, inventory, or business insights!</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white'}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && <div className="flex justify-start"><div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-2xl"><div className="flex gap-1"><div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div><div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div></div></div></div>}
            </div>

            <div className="p-4 border-t dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything..."
                  className="flex-1 p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
                <button onClick={handleSend} disabled={isLoading} className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50">
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- 9. EXTRAS ---
const IntegrationsModule = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-800">Integrations</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[{ name: 'Instagram Shop', icon: Instagram, color: 'text-pink-600', status: 'Connect' }, { name: 'Facebook Business', icon: Facebook, color: 'text-blue-600', status: 'Connect' }, { name: 'Shopify', icon: ShoppingCart, color: 'text-green-600', status: 'Coming Soon' }].map((tool, i) => (
        <Card key={i} className="text-center p-8 hover:shadow-2xl transition-all"><tool.icon size={56} className={`mx-auto mb-4 ${tool.color}`} /><h3 className="font-bold text-lg text-gray-800">{tool.name}</h3><Button variant="secondary" className="w-full mt-6 rounded-full">Connect</Button></Card>
      ))}
    </div>
  </div>
);

const UserSettings = ({ appId }) => {
  const [team, setTeam] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', role: 'Worker', userId: '', password: '' });
  useEffect(() => onSnapshot(collection(db, 'artifacts', appId, 'users', COMPANY_ID, 'team'), s => setTeam(s.docs.map(d => ({ id: d.id, ...d.data() })))), [appId]);
  const handleAdd = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', appId, 'users', COMPANY_ID, 'team'), { ...newMember, createdAt: serverTimestamp() }); setNewMember({ name: '', role: 'Worker', userId: '', password: '' }); };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">User Settings</h2>
      <Card><form onSubmit={handleAdd} className="flex gap-3"><input placeholder="Name" className="p-3 border rounded-xl bg-gray-50" required value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} /><input placeholder="User ID" className="p-3 border rounded-xl bg-gray-50" required value={newMember.userId} onChange={e => setNewMember({ ...newMember, userId: e.target.value })} /><input placeholder="Password" type="password" className="p-3 border rounded-xl bg-gray-50" required value={newMember.password} onChange={e => setNewMember({ ...newMember, password: e.target.value })} /><select className="p-3 border rounded-xl bg-gray-50" value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}><option>Worker</option><option>Admin</option></select><Button>Add</Button></form></Card>
      <div className="grid gap-4 md:grid-cols-3">{team.map(m => <Card key={m.id} className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-xl">{m.name[0]}</div><div><h3 className="font-bold text-gray-800">{m.name}</h3><p className="text-sm text-gray-500">@{m.userId} • {m.role}</p></div></Card>)}</div>
    </div>
  );
};

const ReportsModule = ({ invoices, expenses }) => {
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(invoices);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, "Inara_Sales_Report.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
        <div className="flex gap-2">
          <Button onClick={exportExcel} variant="secondary" icon={FileDown}>Export Excel</Button>
          <Button onClick={() => downloadCSV(invoices, `inara_sales.csv`)} icon={Download}>Export CSV</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><h3 className="font-bold mb-4 text-gray-800">Recent Sales</h3><div className="overflow-auto h-64"><table className="w-full text-sm text-left"><thead><tr><th>Date</th><th>Customer</th><th>Amount</th></tr></thead><tbody>{invoices.slice(0, 20).map(inv => <tr key={inv.id} className="border-b"><td className="p-2">{new Date(inv.date).toLocaleDateString()}</td><td className="p-2">{inv.customerName}</td><td className="p-2 font-bold">₹{inv.total}</td></tr>)}</tbody></table></div></Card>
        <Card><h3 className="font-bold mb-4 text-gray-800">Recent Expenses</h3><div className="overflow-auto h-64"><table className="w-full text-sm text-left"><thead><tr><th>Date</th><th>Cat</th><th>Amt</th></tr></thead><tbody>{expenses.slice(0, 20).map(e => <tr key={e.id} className="border-b"><td className="p-2">{e.date}</td><td className="p-2">{e.category}</td><td className="p-2 font-bold text-rose-600">₹{e.amount}</td></tr>)}</tbody></table></div></Card>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const InaraApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [team, setTeam] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [parties, setParties] = useState([]);

  useEffect(() => {
    signInAnonymously(auth);
    const unsubTeam = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'team'), s => setTeam(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubInv = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'inventory'), s => setInventory(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubBill = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'invoices'), s => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubExp = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'expenses'), s => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOut = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'outlets'), s => setOutlets(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubParty = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'parties'), s => setParties(s.docs.map(d => ({ id: d.id, ...d.data() }))));
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
    sessionStorage.setItem('current_user', JSON.stringify(member));
    showToast(`Welcome back, ${member.name}`);
    setCurrentUser(member);
  };

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center bg-purple-900 p-4">
      <Card className="w-full max-w-md p-10 space-y-6 text-center shadow-2xl">
        <h1 className="text-4xl font-extrabold text-purple-800">INARA ERP</h1>
        <p className="text-gray-400 text-sm uppercase tracking-widest">Elegance & Efficiency</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input className="w-full p-4 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none" required value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="User ID" />
          <input type="password" className="w-full p-4 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none" required value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Password" />
          <Button className="w-full py-4 text-lg bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 shadow-lg">{team.length === 0 ? 'Create Company Account' : 'Login'}</Button>
        </form>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="md:hidden bg-purple-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <span className="font-bold text-lg tracking-wide italic">INARA ERP</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-white/10 rounded-lg">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}><Menu /></button>
        </div>
      </div>

      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:block fixed md:relative z-40 w-full md:w-72 h-full ${BRAND.sidebar} flex flex-col`}>
        <div className="p-8 bg-purple-900/40 text-white hidden md:block">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-extrabold tracking-wide"
          >INARA</motion.h1>
          <p className="text-purple-300 text-xs mt-1 font-medium">ERP v6.1 • Premium</p>
        </div>
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'estimates', icon: FileCheck, label: 'Estimates & Quotes' },
            { id: 'billing', icon: ShoppingCart, label: 'Terminal / POS' },
            { id: 'inventory', icon: Package, label: 'Inventory' },
            { id: 'procurement', icon: Truck, label: 'Procurement' },
            { id: 'expenses', icon: DollarSign, label: 'Finance' },
            { id: 'reports', icon: FileText, label: 'Reports' },
            { id: 'parties', icon: Store, label: 'Parties & Outlets', admin: true },
            { id: 'organization', icon: Building2, label: 'Organization', admin: true },
            { id: 'integrations', icon: Link, label: 'Integrations', admin: true },
            { id: 'team', icon: Settings, label: 'User Settings', admin: true },
          ].map(i => (!i.admin || currentUser.role !== 'Worker') && (
            <button key={i.id} onClick={() => { setActiveTab(i.id); setIsMenuOpen(false) }} className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all font-medium ${activeTab === i.id ? 'bg-purple-50 text-purple-700 shadow-sm dark:bg-purple-900/40 dark:text-purple-300' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-purple-300'}`}><i.icon size={20} />{i.label}</button>
          ))}
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-4 p-3.5 text-rose-500 mt-auto hover:bg-rose-50 rounded-xl transition-colors"><Lock size={20} /> Logout</button>
        </nav>
        <div className="p-6 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300">{currentUser.name[0]}</div>
              <div className="max-w-[120px]"><div className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{currentUser.name}</div><div className="text-[10px] text-gray-400 capitalize">{currentUser.role}</div></div>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-gray-400 hover:bg-purple-50 dark:hover:bg-white/5 rounded-xl transition-all">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 md:p-10 overflow-auto h-[calc(100vh-60px)] md:h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && <Dashboard inventory={inventory} invoices={invoices} expenses={expenses} currentUser={currentUser} showToast={showToast} />}
            {activeTab === 'estimates' && <EstimatesModule inventory={inventory} parties={parties} showToast={showToast} />}
            {activeTab === 'procurement' && <ProcurementModule inventory={inventory} parties={parties} showToast={showToast} />}
            {activeTab === 'team' && <UserSettings appId={APP_ID} />}
            {activeTab === 'parties' && <PartiesModule />}
            {activeTab === 'organization' && <OrganizationProfile showToast={showToast} />}
            {activeTab === 'integrations' && <IntegrationsModule />}
            {activeTab === 'inventory' && <InventoryManager inventory={inventory} outlets={outlets} showToast={showToast} parties={parties} />}
            {activeTab === 'billing' && <BillingSales inventory={inventory} showToast={showToast} parties={parties} invoices={invoices} />}
            {activeTab === 'expenses' && <ExpenseManager expenses={expenses} outlets={outlets} parties={parties} showToast={showToast} />}
            {activeTab === 'reports' && <ReportsModule invoices={invoices} expenses={expenses} />}
          </motion.div>
        </AnimatePresence>

        {/* AI Assistant - Always visible */}
        <AIAssistant inventory={inventory} invoices={invoices} expenses={expenses} />
      </main>

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        inventory={inventory}
        onNavigate={setActiveTab}
      />

      <AnimatePresence>
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default InaraApp;
