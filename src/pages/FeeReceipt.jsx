import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Printer, ArrowLeft, Plus, Trash2, Search, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const CLASSES = [
  'Reception Class', 'Nursery 1', 'Nursery 2',
  'Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B',
  'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B',
  'JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B',
  'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B',
  'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B',
  'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B',
];

const STANDARD_FEE_ITEMS = [
  'Previous Balance', 'Form', 'Badge', 'Registration Fee', 'Tuition Fee',
  'Exam Fee (Internal Only)', 'Development Fee', 'P.T.A', 'Lesson Fee',
  'Graduation Fee', 'Sports', 'Sanitary', 'Books',
];

function numberToWords(num) {
  if (!num) return 'Zero Naira Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
  };
  return convert(Math.floor(num)) + ' Naira Only';
}

export default function FeeReceipt() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    student_name: '', received_from: '', class: '', term: '', session: '', balance: '',
    items: STANDARD_FEE_ITEMS.map(name => ({ name, amount: '', selected: false })),
    others: [],
    payment_method: 'Cash',
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const receiptRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.SchoolSettings.list().then(s => {
      if (s[0]) {
        setSettings(s[0]);
        setForm(f => ({ ...f, session: s[0].current_session || '' }));
      }
    });
    generateReceiptNumber();
  }, []);

  const generateReceiptNumber = async () => {
    const existing = await base44.entities.SchoolFeePayment.list('-created_date', 1);
    const lastNum = existing[0]?.receipt_number ? parseInt(existing[0].receipt_number.replace(/\D/g, '')) || 0 : 0;
    setReceiptNumber('RCP' + String(lastNum + 1).padStart(5, '0'));
  };

  const handleStudentSearch = async () => {
    if (!studentSearch.trim()) return;
    setSearching(true);
    try {
      const results = await base44.entities.Student.list('-created_date', 500);
      const q = studentSearch.toLowerCase();
      const matched = results.filter(s =>
        `${s.first_name} ${s.last_name} ${s.middle_name || ''}`.toLowerCase().includes(q) ||
        (s.admission_number || '').toLowerCase().includes(q)
      );
      setSearchResults(matched.slice(0, 10));
      if (matched.length === 0) {
        toast({ title: 'No student found', description: 'Try searching by name or admission number', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error searching students', variant: 'destructive' });
    }
    setSearching(false);
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setForm(f => ({
      ...f,
      student_name: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
      class: student.current_class || '',
      session: f.session || settings?.current_session || '',
    }));
    setSearchResults([]);
    setStudentSearch('');
  };

  const toggleItem = (idx) => {
    const items = [...form.items];
    items[idx].selected = !items[idx].selected;
    if (!items[idx].selected) items[idx].amount = '';
    setForm({ ...form, items });
  };

  const setItemAmount = (idx, val) => {
    const items = [...form.items];
    items[idx].amount = val;
    setForm({ ...form, items });
  };

  const addOther = () => {
    setForm({ ...form, others: [...form.others, { name: '', amount: '' }] });
  };

  const removeOther = (idx) => {
    const others = form.others.filter((_, i) => i !== idx);
    setForm({ ...form, others });
  };

  const setOtherField = (idx, field, val) => {
    const others = [...form.others];
    others[idx][field] = val;
    setForm({ ...form, others });
  };

  const selectedStandard = form.items.filter(i => i.selected && i.amount);
  const validOthers = form.others.filter(o => o.name && o.amount);
  const totalPaid = [...selectedStandard, ...validOthers].reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  const handlePrint = async () => {
    if (!form.student_name || !form.class || !form.term) {
      toast({ title: 'Please fill student name, class and term', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const allItems = [
        ...selectedStandard.map(i => ({ item_name: i.name, amount: parseFloat(i.amount) })),
        ...validOthers.map(i => ({ item_name: i.name, amount: parseFloat(i.amount) }))
      ];

      // Get accountant info from session
      const accountantData = JSON.parse(sessionStorage.getItem('accountant_data') || '{}');
      const accountantName = accountantData.first_name
        ? `${accountantData.first_name} ${accountantData.last_name}`
        : 'Accountant';

      const paymentData = {
        receipt_number: receiptNumber,
        student_id: selectedStudent?.id || '',
        student_name: form.student_name,
        admission_number: selectedStudent?.admission_number || '',
        class: form.class,
        section: selectedStudent?.section || '',
        term: form.term,
        session: form.session || settings?.current_session || '',
        parent_name: selectedStudent?.parent_name || '',
        parent_phone: selectedStudent?.parent_phone || '',
        items: allItems,
        total_amount: totalPaid,
        amount_paid: totalPaid,
        balance: parseFloat(form.balance || 0),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: form.payment_method,
        recorded_by: accountantName,
        status: 'Paid',
      };
      await base44.entities.SchoolFeePayment.create(paymentData);

      toast({ title: 'Receipt saved successfully!', description: 'Opening print dialog...' });

      // Use native print — most reliable, no html2canvas needed
      const receiptHtml = receiptRef.current.innerHTML;
      const printWin = window.open('', '_blank', 'width=400,height=600');
      printWin.document.write(`
        <html>
        <head>
          <title>Receipt ${receiptNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 10px; color: #000; width: 80mm; margin: 0 auto; padding: 4px; }
            table { width: 100%; border-collapse: collapse; }
            @media print { @page { margin: 0; } }
          </style>
        </head>
        <body>${receiptHtml}</body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 300);

      // Reset form
      generateReceiptNumber();
      setForm({
        student_name: '', received_from: '', class: '', term: '', session: settings?.current_session || '',
        balance: '',
        items: STANDARD_FEE_ITEMS.map(name => ({ name, amount: '', selected: false })),
        others: [],
        payment_method: 'Cash',
      });
      setSelectedStudent(null);
    } catch (error) {
      console.error('Receipt error:', error);
      toast({ title: 'Error saving receipt', description: error.message || 'Please try again', variant: 'destructive' });
    }
    setSaving(false);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-[#1e3a5f] text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/AccountantPortal"><ArrowLeft className="w-5 h-5 hover:opacity-70" /></Link>
            <h1 className="text-xl font-bold">Fee Receipt Generator</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/ReceiptManagement">
              <Button variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Search className="w-4 h-4 mr-2" /> Manage Receipts
              </Button>
            </Link>
            <Button onClick={handlePrint} disabled={saving} className="bg-white text-[#1e3a5f] hover:bg-white/90">
              <Printer className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save & Print Receipt'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Student Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Find Student</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or admission number..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStudentSearch()}
              className="flex-1"
            />
            <Button onClick={handleStudentSearch} disabled={searching} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
              <Search className="w-4 h-4 mr-2" /> {searching ? '...' : 'Search'}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 border rounded-lg divide-y max-h-60 overflow-y-auto">
              {searchResults.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectStudent(s)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{s.first_name} {s.middle_name} {s.last_name}</p>
                    <p className="text-xs text-gray-500">{s.admission_number} · {s.current_class} · {s.section}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-500 opacity-0 hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
          {selectedStudent && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-green-800">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p className="text-xs text-green-600">Adm: {selectedStudent.admission_number} · {selectedStudent.current_class} · {selectedStudent.section}</p>
                {selectedStudent.parent_name && <p className="text-xs text-green-600">Parent: {selectedStudent.parent_name} · {selectedStudent.parent_phone}</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => { setSelectedStudent(null); setForm({ ...form, student_name: '', class: '' }); }}>Change</Button>
            </div>
          )}
          {!selectedStudent && (
            <p className="mt-2 text-xs text-gray-400">Or fill in student details manually below.</p>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Receipt Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Student Full Name *</Label>
              <Input value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} placeholder="Enter student name" />
            </div>
            <div>
              <Label>Received From</Label>
              <Input value={form.received_from} onChange={e => setForm({ ...form, received_from: e.target.value })} placeholder="Parent/Guardian name" />
            </div>
            <div>
              <Label>Class *</Label>
              <Select value={form.class} onValueChange={v => setForm({ ...form, class: v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Term *</Label>
              <Select value={form.term} onValueChange={v => setForm({ ...form, term: v })}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">1st Term</SelectItem>
                  <SelectItem value="Second Term">2nd Term</SelectItem>
                  <SelectItem value="Third Term">3rd Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session *</Label>
              <Input value={form.session} onChange={e => setForm({ ...form, session: e.target.value })} placeholder="e.g. 2025/2026" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <h3 className="font-semibold text-gray-700 mb-3">Standard Fee Items</h3>
          <div className="space-y-2 mb-4">
            {form.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input type="checkbox" id={`item-${idx}`} checked={item.selected} onChange={() => toggleItem(idx)} className="w-4 h-4 accent-[#1e3a5f]" />
                <label htmlFor={`item-${idx}`} className="text-sm font-medium w-48 text-gray-700">{item.name}</label>
                {item.selected && (
                  <Input type="number" placeholder="Amount (₦)" value={item.amount} onChange={e => setItemAmount(idx, e.target.value)} className="w-32 h-8 text-sm" />
                )}
              </div>
            ))}
          </div>

          {/* Others — multiple items */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Other Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addOther} className="text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            {form.others.length === 0 && (
              <p className="text-sm text-gray-400 mb-2">No other items added. Click "Add Item" to add custom fee items.</p>
            )}
            {form.others.map((other, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <Input placeholder="Item name (e.g. Uniform)" value={other.name} onChange={e => setOtherField(idx, 'name', e.target.value)} className="flex-1 h-8 text-sm" />
                <Input type="number" placeholder="Amount (₦)" value={other.amount} onChange={e => setOtherField(idx, 'amount', e.target.value)} className="w-32 h-8 text-sm" />
                <button type="button" onClick={() => removeOther(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <Label>Balance (if any):</Label>
            <Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} className="w-32" placeholder="0.00" />
          </div>

          <div className="mt-4 p-4 bg-[#1e3a5f]/10 rounded-lg">
            <p className="text-lg font-bold text-[#1e3a5f]">Total: ₦{totalPaid.toLocaleString()}</p>
            <p className="text-sm text-gray-600">{numberToWords(totalPaid)}</p>
          </div>
        </div>

        {/* PRINTABLE RECEIPT (hidden on screen, used for print) */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div ref={receiptRef} style={{ width: '80mm', backgroundColor: 'white', padding: '8px', fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a5f', paddingBottom: '6px', marginBottom: '6px' }}>
              {settings?.school_logo && <img src={settings.school_logo} alt="logo" crossOrigin="anonymous" style={{ width: '40px', height: '40px', objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} />}
              <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e3a5f' }}>{settings?.school_name || 'MILTON COLLEGE OF ARTS AND SCIENCE'}</div>
              <div style={{ fontSize: '8px', color: '#555' }}>{settings?.address || 'Kaduna, Nigeria'}</div>
              <div style={{ fontSize: '8px', color: '#555' }}>Tel: {settings?.phone || ''} | Email: {settings?.email || ''}</div>
              <div style={{ marginTop: '4px', fontWeight: 'bold', fontSize: '10px', color: '#1e3a5f', borderTop: '1px dashed #ccc', paddingTop: '4px' }}>OFFICIAL SCHOOL FEE RECEIPT</div>
            </div>
            <div style={{ marginBottom: '6px', fontSize: '9px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><b>Receipt No:</b> {receiptNumber}</span>
                <span><b>Date:</b> {dateStr}</span>
              </div>
              <div><b>Time:</b> {timeStr}</div>
            </div>
            <div style={{ borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '4px 0', marginBottom: '6px', fontSize: '9px' }}>
              <div><b>Received From:</b> {form.received_from || form.student_name}</div>
              <div><b>Student Name:</b> {form.student_name}</div>
              {selectedStudent?.admission_number && <div><b>Admission No:</b> {selectedStudent.admission_number}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><b>Class:</b> {form.class}</span>
                <span><b>Term:</b> {form.term}</span>
              </div>
              <div><b>Session:</b> {form.session || settings?.current_session || ''}</div>
              <div><b>Method:</b> {form.payment_method}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '6px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e3a5f', color: 'white' }}>
                  <th style={{ padding: '3px 4px', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '3px 4px', textAlign: 'right' }}>Amount (₦)</th>
                </tr>
              </thead>
              <tbody>
                {selectedStandard.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '2px 4px' }}>{item.name}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right' }}>{parseFloat(item.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {validOthers.map((item, idx) => (
                  <tr key={`other-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '2px 4px' }}>{item.name}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right' }}>{parseFloat(item.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f0f4ff', fontWeight: 'bold' }}>
                  <td style={{ padding: '3px 4px' }}>TOTAL AMOUNT PAID</td>
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>₦{totalPaid.toLocaleString()}</td>
                </tr>
                {form.balance && parseFloat(form.balance) > 0 && (
                  <tr>
                    <td style={{ padding: '2px 4px', color: 'red' }}>Balance Outstanding</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right', color: 'red' }}>₦{parseFloat(form.balance).toLocaleString()}</td>
                  </tr>
                )}
              </tfoot>
            </table>
            <div style={{ fontSize: '8px', borderTop: '1px dashed #999', paddingTop: '4px', marginBottom: '6px' }}>
              <b>The Sum of:</b> {numberToWords(totalPaid)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '2px', width: '60px' }}>Cashier</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '2px', width: '60px' }}>Accountant</div>
              </div>
            </div>
            <div style={{ marginTop: '8px', borderTop: '2px solid #1e3a5f', paddingTop: '4px', textAlign: 'center', fontSize: '7px', color: '#1e3a5f' }}>
              <div><b>{settings?.school_name || 'Milton College of Arts and Science'}</b></div>
              <div>{dateStr} | {timeStr}</div>
              <div style={{ marginTop: '2px', fontStyle: 'italic' }}>Thank you for your payment!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}