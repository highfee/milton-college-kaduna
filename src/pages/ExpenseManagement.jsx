import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Printer, Receipt, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printExpense, setPrintExpense] = useState(null);

  const [form, setForm] = useState({
    expense_name: '', reason: '', department: '', collected_by: '', items: [{ item_name: '', description: '', quantity: 1, unit_cost: 0, total_amount: 0 }],
    notes: ''
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [exps, settings] = await Promise.all([
      base44.entities.Expense.list('-created_date', 200),
      base44.entities.SchoolSettings.list()
    ]);
    setExpenses(exps);
    const s = settings[0] || {};
    setForm(prev => ({ ...prev, term: s.current_term || '', session: s.current_session || '' }));
    setLoading(false);
  };

  const calcGrandTotal = (items) => items.reduce((s, it) => s + (it.total_amount || 0), 0);

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    if (field === 'quantity' || field === 'unit_cost') {
      items[idx].total_amount = (field === 'quantity' ? val : items[idx].quantity) * (field === 'unit_cost' ? val : items[idx].unit_cost);
    }
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { item_name: '', description: '', quantity: 1, unit_cost: 0, total_amount: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleSave = async () => {
    if (!form.expense_name || !form.department) { alert('Please fill required fields'); return; }
    setSaving(true);
    const now = new Date();
    const rn = 'EXP' + Date.now();
    const grand_total = calcGrandTotal(form.items);
    await base44.entities.Expense.create({
      ...form,
      grand_total,
      receipt_number: rn,
      expense_date: now.toISOString().split('T')[0],
      expense_time: now.toTimeString().split(' ')[0].substring(0, 5),
      status: 'Pending Approval',
    });
    // Notify director
    await base44.entities.DirectorNotification.create({
      title: 'New Expense Recorded',
      message: `${form.expense_name} — ₦${grand_total.toLocaleString()} by ${form.department}. Awaiting approval.`,
      type: 'expense'
    });
    setShowForm(false);
    setForm({ expense_name: '', reason: '', department: '', collected_by: '', items: [{ item_name: '', description: '', quantity: 1, unit_cost: 0, total_amount: 0 }], notes: '' });
    setSaving(false);
    load();
  };

  const printReceipt = (exp) => {
    setPrintExpense(exp);
    setTimeout(() => window.print(), 300);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-gray-500 text-sm">Record and manage school expenditures</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />New Expense
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Expenses', value: `₦${expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + (e.grand_total || 0), 0).toLocaleString()}`, color: 'text-red-600' },
            { label: 'Pending Approval', value: expenses.filter(e => e.status === 'Pending Approval').length, color: 'text-orange-500' },
            { label: 'Approved', value: expenses.filter(e => e.status === 'Approved').length, color: 'text-green-600' },
            { label: 'Total Records', value: expenses.length, color: 'text-blue-600' },
          ].map((s, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-600" />Expense Records</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Receipt #', 'Expense Name', 'Department', 'Collected By', 'Amount', 'Date', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>)}</tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No expenses recorded yet</td></tr>
                ) : expenses.map(exp => (
                  <tr key={exp.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{exp.receipt_number}</td>
                    <td className="px-3 py-2 font-medium">{exp.expense_name}</td>
                    <td className="px-3 py-2">{exp.department}</td>
                    <td className="px-3 py-2">{exp.collected_by}</td>
                    <td className="px-3 py-2 font-bold text-red-600">₦{(exp.grand_total || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-gray-500">{exp.expense_date} {exp.expense_time}</td>
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${exp.status === 'Approved' ? 'bg-green-100 text-green-700' : exp.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{exp.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setPrintExpense(exp)}>
                        <Printer className="w-3 h-3 mr-1" />Print Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* NEW EXPENSE DIALOG */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record New Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expense Name *</Label>
                <Input value={form.expense_name} onChange={e => setForm({ ...form, expense_name: e.target.value })} placeholder="e.g. Office Supplies" className="mt-1" />
              </div>
              <div>
                <Label>Department *</Label>
                <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Administration" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reason for Expense</Label>
                <Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Why is this expense needed?" className="mt-1" />
              </div>
              <div>
                <Label>Collected By (Who received the money)</Label>
                <Input value={form.collected_by} onChange={e => setForm({ ...form, collected_by: e.target.value })} placeholder="Staff name" className="mt-1" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Expense Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add Item</Button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg items-end">
                    <div>
                      <Label className="text-xs">Item Name</Label>
                      <Input className="mt-1 text-sm" value={item.item_name} onChange={e => updateItem(idx, 'item_name', e.target.value)} placeholder="Item" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input className="mt-1 text-sm" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Details" />
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" className="mt-1 text-sm" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Cost (₦)</Label>
                      <Input type="number" className="mt-1 text-sm" value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Total</Label>
                        <p className="mt-1 text-sm font-bold text-green-700 py-2 px-1">₦{(item.total_amount || 0).toLocaleString()}</p>
                      </div>
                      {form.items.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
                <span className="font-semibold text-emerald-700">Grand Total:</span>
                <span className="text-xl font-bold text-emerald-700">₦{calcGrandTotal(form.items).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1" placeholder="Additional notes..." />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <p>This expense will be submitted to the Director for approval. You can print the receipt immediately, but it will show "Pending Director Approval" until signed.</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save & Submit for Approval'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PRINT RECEIPT DIALOG */}
      <Dialog open={!!printExpense} onOpenChange={() => setPrintExpense(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Expense Receipt</DialogTitle></DialogHeader>
          {printExpense && (
            <div className="space-y-4">
              <div id="expense-receipt" className="border rounded-lg p-6 bg-white">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold">MILTON COLLEGE OF ARTS AND SCIENCE</h2>
                  <p className="text-gray-500 text-sm">Kaduna</p>
                  <h3 className="text-lg font-bold mt-3 border-t pt-3">EXPENSE RECEIPT</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="text-gray-500">Receipt No:</span> <strong>{printExpense.receipt_number}</strong></div>
                  <div><span className="text-gray-500">Date:</span> <strong>{printExpense.expense_date}</strong></div>
                  <div><span className="text-gray-500">Time:</span> <strong>{printExpense.expense_time}</strong></div>
                  <div><span className="text-gray-500">Department:</span> <strong>{printExpense.department}</strong></div>
                  <div><span className="text-gray-500">Collected By:</span> <strong>{printExpense.collected_by}</strong></div>
                  <div><span className="text-gray-500">Reason:</span> <strong>{printExpense.reason}</strong></div>
                </div>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Expense: {printExpense.expense_name}</h4>
                  <table className="w-full text-sm border-collapse border">
                    <thead><tr className="bg-gray-100">{['Item', 'Description', 'Qty', 'Unit Cost', 'Total'].map(h => <th key={h} className="border px-2 py-1 text-left text-xs">{h}</th>)}</tr></thead>
                    <tbody>
                      {(printExpense.items || []).map((item, i) => (
                        <tr key={i}><td className="border px-2 py-1">{item.item_name}</td><td className="border px-2 py-1">{item.description}</td><td className="border px-2 py-1">{item.quantity}</td><td className="border px-2 py-1">₦{(item.unit_cost || 0).toLocaleString()}</td><td className="border px-2 py-1 font-bold">₦{(item.total_amount || 0).toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-gray-50"><td colSpan={4} className="border px-2 py-1 font-bold text-right">Grand Total:</td><td className="border px-2 py-1 font-bold text-red-600">₦{(printExpense.grand_total || 0).toLocaleString()}</td></tr></tfoot>
                  </table>
                </div>
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between">
                    <div className="text-center">
                      <div className="border-t border-gray-400 w-40 mt-8 mx-auto"></div>
                      <p className="text-xs mt-1">Prepared By (Accountant)</p>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-gray-400 w-40 mt-8 mx-auto"></div>
                      <p className="text-xs mt-1">
                        Director's Signature
                        {printExpense.status !== 'Approved' && <span className="block text-orange-500 font-bold text-xs">(PENDING APPROVAL)</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}