// Estimates Module Component
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const EstimatesModule = ({ inventory, parties, showToast, db, APP_ID, COMPANY_ID }) => {
    const [estimates, setEstimates] = useState([]);
    const [cart, setCart] = useState([]);
    const [meta, setMeta] = useState({ customerName: '', validUntil: '', notes: '' });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'estimates'),
            s => setEstimates(s.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return unsub;
    }, []);

    const addToCart = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
            setCart([...cart, { ...item, qty: 1 }]);
        }
    };

    const handleCreateEstimate = async () => {
        if (cart.length === 0) return showToast('Add items to estimate', 'error');

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const tax = subtotal * 0.12;
        const total = subtotal + tax;

        await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'estimates'), {
            items: cart,
            ...meta,
            subtotal,
            tax,
            total,
            status: 'Draft',
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
        });

        showToast('Estimate created successfully');
        setCart([]);
        setMeta({ customerName: '', validUntil: '', notes: '' });
    };

    const convertToInvoice = async (estimate) => {
        await addDoc(collection(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'invoices'), {
            ...estimate,
            status: 'Sent',
            billNumber: `INV-${Date.now()}`,
            estimateId: estimate.id,
            date: new Date().toISOString()
        });

        await updateDoc(doc(db, 'artifacts', APP_ID, 'users', COMPANY_ID, 'estimates', estimate.id), {
            status: 'Converted'
        });

        showToast('Converted to Invoice');
    };

    const filteredInventory = inventory.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Estimates & Quotes</h2>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-xl">+ New Estimate</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Estimate Builder */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="glass p-4 rounded-xl">
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full p-3 border rounded-xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredInventory.slice(0, 12).map(item => (
                            <div
                                key={item.id}
                                onClick={() => addToCart(item)}
                                className="glass p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                            >
                                <h4 className="font-bold text-gray-800">{item.name}</h4>
                                <p className="text-xs text-gray-500">{item.sku}</p>
                                <p className="text-lg font-bold text-purple-600 mt-2">₹{item.price}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cart & Meta */}
                <div className="space-y-4">
                    <div className="glass p-4 rounded-xl">
                        <h3 className="font-bold mb-4">Estimate Details</h3>
                        <input
                            type="text"
                            placeholder="Customer Name"
                            className="w-full p-2 border rounded-lg mb-2"
                            value={meta.customerName}
                            onChange={e => setMeta({ ...meta, customerName: e.target.value })}
                        />
                        <input
                            type="date"
                            placeholder="Valid Until"
                            className="w-full p-2 border rounded-lg mb-2"
                            value={meta.validUntil}
                            onChange={e => setMeta({ ...meta, validUntil: e.target.value })}
                        />
                        <textarea
                            placeholder="Notes"
                            className="w-full p-2 border rounded-lg"
                            value={meta.notes}
                            onChange={e => setMeta({ ...meta, notes: e.target.value })}
                        />
                    </div>

                    <div className="glass p-4 rounded-xl">
                        <h3 className="font-bold mb-4">Cart ({cart.length})</h3>
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between mb-2 text-sm">
                                <span>{item.name} x{item.qty}</span>
                                <span>₹{item.price * item.qty}</span>
                            </div>
                        ))}
                        <button
                            onClick={handleCreateEstimate}
                            className="w-full mt-4 py-3 bg-purple-600 text-white rounded-xl"
                        >
                            Create Estimate
                        </button>
                    </div>
                </div>
            </div>

            {/* Estimates List */}
            <div className="glass p-6 rounded-xl">
                <h3 className="font-bold text-lg mb-4">Recent Estimates</h3>
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left p-2">Customer</th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Total</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estimates.map(est => (
                            <tr key={est.id} className="border-b">
                                <td className="p-2">{est.customerName}</td>
                                <td className="p-2">{new Date(est.date).toLocaleDateString()}</td>
                                <td className="p-2 font-bold">₹{est.total}</td>
                                <td className="p-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs ${est.status === 'Converted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {est.status}
                                    </span>
                                </td>
                                <td className="p-2">
                                    {est.status !== 'Converted' && (
                                        <button
                                            onClick={() => convertToInvoice(est)}
                                            className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs"
                                        >
                                            Convert to Invoice
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EstimatesModule;
