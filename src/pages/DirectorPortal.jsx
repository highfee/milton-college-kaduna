import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Building2, LogOut, Eye, EyeOff, TrendingUp, DollarSign, Users, BarChart3,
  Bell, Briefcase, Receipt, AlertCircle, CheckCircle, Clock, Megaphone,
  HardHat, BookOpen, Send, Printer, Plus, Edit, X, TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DIRECTOR_EMAIL = 'miltoncollegekd@gmail.com';
const DIRECTOR_PASSWORD = '2Win@MICAS';

export default function DirectorPortal() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data
  const [students, setStudents] = useState([]);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [nonAcadStaff, setNonAcadStaff] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [results, setResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  // Broadcast
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Project dialog
  const [projectDialog, setProjectDialog] = useState(null);
  const [projectForm, setProjectForm] = useState({});
  const [projectSaving, setProjectSaving] = useState(false);

  // Salary dialog
  const [salaryDialog, setSalaryDialog] = useState(null);
  const [salaryForm, setSalaryForm] = useState({});
  const [salarySaving, setSalarySaving] = useState(false);

  // Expense approval
  const [expenseApproving, setExpenseApproving] = useState(null);

  // Period filter
  const [period, setPeriod] = useState('term');

  useEffect(() => {
    const s = sessionStorage.getItem('director_logged_in');
    if (s === 'true') { setLoggedIn(true); loadAll(); }
  }, []);

  const handleLogin = () => {
    if (!email || !password) { setLoginError('Enter email and password'); return; }
    setLoginLoading(true);
    setTimeout(() => {
      if (email.trim() === DIRECTOR_EMAIL && password === DIRECTOR_PASSWORD) {
        sessionStorage.setItem('director_logged_in', 'true');
        setLoggedIn(true);
        loadAll();
      } else {
        setLoginError('Invalid credentials');
      }
      setLoginLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('director_logged_in');
    setLoggedIn(false);
    setEmail(''); setPassword('');
  };

  const loadAll = async () => {
    setLoading(true);
    const [st, arch, tc, nas, exp, sal, fee, proj, apps, res, notifs, sett] = await Promise.all([
      base44.entities.Student.list('-created_date', 500),
      base44.entities.ArchivedStudent.list('-created_date', 200),
      base44.entities.Teacher.list(),
      base44.entities.NonAcademicStaff.list(),
      base44.entities.Expense.list('-created_date', 500),
      base44.entities.SalaryPayment.list('-created_date', 500),
      base44.entities.SchoolFeePayment.list('-created_date', 500),
      base44.entities.SchoolProject.list(),
      base44.entities.AdmissionApplication.list('-created_date', 200),
      base44.entities.Result.list('-created_date', 200),
      base44.entities.DirectorNotification.list('-created_date', 50),
      base44.entities.SchoolSettings.list()
    ]);
    setStudents(st); setArchivedStudents(arch); setTeachers(tc); setNonAcadStaff(nas);
    setExpenses(exp); setSalaryPayments(sal); setFeePayments(fee); setProjects(proj);
    setApplications(apps); setResults(res); setNotifications(notifs); setSettings(sett[0] || {});
    setLoading(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastSending(true);
    await base44.entities.ChatMessage.create({
      conversation_id: 'BROADCAST',
      sender_id: 'director',
      sender_name: 'Director',
      sender_role: 'admin',
      content: broadcastMsg,
      is_broadcast: true,
      target_audience: 'Staff'
    });
    setBroadcastMsg('');
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 3000);
    setBroadcastSending(false);
  };

  const handleApproveExpense = async (exp) => {
    setExpenseApproving(exp.id);
    await base44.entities.Expense.update(exp.id, { status: 'Approved', approved_by: 'Director', approved_date: new Date().toISOString().split('T')[0] });
    await loadAll();
    setExpenseApproving(null);
  };

  const handleSaveProject = async () => {
    setProjectSaving(true);
    const data = { ...projectForm, balance: (projectForm.total_cost || 0) - (projectForm.amount_paid || 0) };
    if (projectDialog?.id) await base44.entities.SchoolProject.update(projectDialog.id, data);
    else await base44.entities.SchoolProject.create(data);
    setProjectDialog(null);
    setProjectForm({});
    setProjectSaving(false);
    loadAll();
  };

  const handlePaySalary = async () => {
    setSalarySaving(true);
    const rn = 'SAL' + Date.now();
    await base44.entities.SalaryPayment.create({ ...salaryForm, receipt_number: rn, payment_date: new Date().toISOString().split('T')[0], paid_by: 'Director', status: 'Paid' });
    // Notify teacher
    await base44.entities.DirectorNotification.create({
      title: 'Salary Paid',
      message: `Salary of ₦${(salaryForm.amount || 0).toLocaleString()} has been paid to ${salaryForm.staff_name}`,
      type: 'salary_due'
    });
    setSalaryDialog(null);
    setSalaryForm({});
    setSalarySaving(false);
    loadAll();
  };

  const markNotifRead = async (id) => {
    await base44.entities.DirectorNotification.update(id, { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // === STATS ===
  const totalRevenue = feePayments.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const totalExpenses = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + (e.grand_total || 0), 0);
  const totalSalaries = salaryPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses - totalSalaries;
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  // New intakes this month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const newIntakeThisMonth = applications.filter(a => a.status === 'Admitted' && (a.application_date || '').startsWith(thisMonth)).length;
  const newIntakeRevenueThisMonth = feePayments.filter(p => (p.payment_date || '').startsWith(thisMonth)).reduce((s, p) => s + (p.amount_paid || 0), 0);

  const pendingExpenses = expenses.filter(e => e.status === 'Pending Approval');
  const allStaff = [...teachers, ...nonAcadStaff];

  if (!loggedIn) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <div className="bg-gradient-to-r from-slate-800 to-blue-800 rounded-t-xl p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Director Portal</h1>
          <p className="text-white/70 text-sm mt-1">Milton College of Arts & Science</p>
        </div>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Email Address</Label>
            <Input type="email" placeholder="Enter email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="mt-1" />
          </div>
          <div>
            <Label>Password</Label>
            <div className="relative mt-1">
              <Input type={showPw ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="pr-10" />
              <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <Button className="w-full bg-slate-800 hover:bg-slate-700" onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <p className="text-xs text-center text-gray-400">Forgot password? Contact IT administrator</p>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-slate-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Director Portal</h1>
              <p className="text-white/70 text-xs">Milton College of Arts & Science</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadNotifs > 0 && (
              <div className="relative">
                <Bell className="w-6 h-6 text-yellow-300" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">{unreadNotifs}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="salaries">Salaries</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications {unreadNotifs > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs px-1">{unreadNotifs}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ===== DASHBOARD ===== */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Revenue', value: `₦${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Total Expenses', value: `₦${(totalExpenses + totalSalaries).toLocaleString()}`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Net Profit', value: `₦${netProfit.toLocaleString()}`, icon: DollarSign, color: netProfit >= 0 ? 'text-blue-600' : 'text-red-600', bg: 'bg-blue-50' },
                { label: 'Active Students', value: activeStudents, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((s, i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-xl font-bold mt-1">{s.value}</p>
                    </div>
                    <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'New Intakes (This Month)', value: newIntakeThisMonth, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Revenue (This Month)', value: `₦${newIntakeRevenueThisMonth.toLocaleString()}`, icon: Receipt, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Pending Expenses', value: pendingExpenses.length, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Active Projects', value: projects.filter(p => p.status === 'Ongoing').length, icon: HardHat, color: 'text-cyan-600', bg: 'bg-cyan-50' },
              ].map((s, i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-xl font-bold mt-1">{s.value}</p>
                    </div>
                    <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pending expense approvals */}
            {pendingExpenses.length > 0 && (
              <Card className="border-0 shadow-md mb-6 border-l-4 border-orange-400">
                <CardHeader><CardTitle className="text-orange-700 flex items-center gap-2"><AlertCircle className="w-5 h-5" />Expenses Awaiting Your Approval</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50 border-b">
                        <tr>
                          {['Expense', 'Department', 'Collected By', 'Amount', 'Date', 'Action'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-xs text-gray-600 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pendingExpenses.map(exp => (
                          <tr key={exp.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{exp.expense_name}</td>
                            <td className="px-4 py-2 text-gray-500">{exp.department}</td>
                            <td className="px-4 py-2">{exp.collected_by}</td>
                            <td className="px-4 py-2 font-bold text-red-600">₦{(exp.grand_total || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-gray-500">{exp.expense_date}</td>
                            <td className="px-4 py-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => handleApproveExpense(exp)} disabled={expenseApproving === exp.id}>
                                <CheckCircle className="w-3 h-3 mr-1" />{expenseApproving === exp.id ? 'Approving...' : 'Approve'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profit summary */}
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle>Profit Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-green-600 mb-1">Gross Revenue</p>
                    <p className="text-2xl font-bold text-green-700">₦{totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600">Total fee collections</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-red-600 mb-1">Total Expenditure</p>
                    <p className="text-2xl font-bold text-red-600">₦{(totalExpenses + totalSalaries).toLocaleString()}</p>
                    <p className="text-xs text-red-500">Expenses + Salaries</p>
                  </div>
                  <div className={`${netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'} rounded-xl p-4 text-center`}>
                    <p className={`text-xs mb-1 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net Profit</p>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>₦{netProfit.toLocaleString()}</p>
                    <p className={`text-xs ${netProfit >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>{netProfit >= 0 ? 'Profit' : 'Deficit'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== FINANCE TAB ===== */}
          <TabsContent value="finance">
            <Card className="border-0 shadow-md mb-6">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" />School Fee Collections</CardTitle>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="term">This Term</SelectItem>
                      <SelectItem value="session">This Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const now2 = new Date();
                  const filtered = feePayments.filter(p => {
                    const d = new Date(p.payment_date || p.created_date);
                    if (period === 'day') return p.payment_date === now2.toISOString().split('T')[0];
                    if (period === 'week') { const wAgo = new Date(now2); wAgo.setDate(wAgo.getDate() - 7); return d >= wAgo; }
                    if (period === 'month') return (p.payment_date || '').startsWith(thisMonth);
                    if (period === 'term') return p.term === settings?.current_term && p.session === settings?.current_session;
                    return p.session === settings?.current_session;
                  });
                  const total = filtered.reduce((s, p) => s + (p.amount_paid || 0), 0);
                  return (
                    <div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                          <p className="text-xs text-green-600">Total Collected</p>
                          <p className="text-2xl font-bold text-green-700">₦{total.toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                          <p className="text-xs text-blue-600">Transactions</p>
                          <p className="text-2xl font-bold text-blue-700">{filtered.length}</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                          <p className="text-xs text-purple-600">Avg per Payment</p>
                          <p className="text-2xl font-bold text-purple-700">₦{filtered.length ? Math.round(total / filtered.length).toLocaleString() : 0}</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto max-h-80">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b sticky top-0">
                            <tr>{['Receipt #', 'Student', 'Class', 'Term', 'Amount', 'Date', 'Status'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {filtered.slice(0, 100).map(p => (
                              <tr key={p.id} className="border-b hover:bg-gray-50">
                                <td className="px-3 py-2 font-mono text-xs">{p.receipt_number}</td>
                                <td className="px-3 py-2 font-medium">{p.student_name}</td>
                                <td className="px-3 py-2">{p.class}</td>
                                <td className="px-3 py-2">{p.term}</td>
                                <td className="px-3 py-2 font-bold text-green-700">₦{(p.amount_paid || 0).toLocaleString()}</td>
                                <td className="px-3 py-2 text-gray-500">{p.payment_date}</td>
                                <td className="px-3 py-2"><Badge className="text-xs bg-green-100 text-green-700">{p.status}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== EXPENSES TAB ===== */}
          <TabsContent value="expenses">
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-orange-600" />All School Expenses</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>{['Receipt', 'Expense Name', 'Reason', 'Department', 'Collected By', 'Amount', 'Date', 'Time', 'Status'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {expenses.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-8 text-gray-400">No expenses recorded yet</td></tr>
                      ) : expenses.map(exp => (
                        <tr key={exp.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{exp.receipt_number}</td>
                          <td className="px-3 py-2 font-medium">{exp.expense_name}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{exp.reason}</td>
                          <td className="px-3 py-2">{exp.department}</td>
                          <td className="px-3 py-2">{exp.collected_by}</td>
                          <td className="px-3 py-2 font-bold text-red-600">₦{(exp.grand_total || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-gray-500">{exp.expense_date}</td>
                          <td className="px-3 py-2 text-gray-500">{exp.expense_time}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${exp.status === 'Approved' ? 'bg-green-100 text-green-700' : exp.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{exp.status}</Badge>
                              {exp.status === 'Pending Approval' && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 h-6 text-xs" onClick={() => handleApproveExpense(exp)} disabled={expenseApproving === exp.id}>
                                  Approve
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== SALARIES TAB ===== */}
          <TabsContent value="salaries">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Staff Salary Management</h2>
              <Button className="bg-slate-800 hover:bg-slate-700" onClick={() => { setSalaryDialog({}); setSalaryForm({}); }}>
                <Plus className="w-4 h-4 mr-2" />Pay Salary
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600">Total Salaries Paid</p>
                <p className="text-2xl font-bold text-blue-700">₦{totalSalaries.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600">Staff Count</p>
                <p className="text-2xl font-bold text-green-700">{allStaff.length}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-xs text-purple-600">Payments This Month</p>
                <p className="text-2xl font-bold text-purple-700">{salaryPayments.filter(p => (p.payment_date || '').startsWith(thisMonth)).length}</p>
              </div>
            </div>
            <Card className="border-0 shadow-md">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Receipt', 'Staff Name', 'Role', 'Month', 'Amount', 'Method', 'Date', 'Paid By'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {salaryPayments.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400">No salary payments yet</td></tr>
                    ) : salaryPayments.map(p => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs">{p.receipt_number}</td>
                        <td className="px-3 py-2 font-medium">{p.staff_name}</td>
                        <td className="px-3 py-2 text-gray-500">{p.role}</td>
                        <td className="px-3 py-2">{p.month}</td>
                        <td className="px-3 py-2 font-bold text-green-700">₦{(p.amount || 0).toLocaleString()}</td>
                        <td className="px-3 py-2">{p.payment_method}</td>
                        <td className="px-3 py-2 text-gray-500">{p.payment_date}</td>
                        <td className="px-3 py-2">{p.paid_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== STUDENTS TAB ===== */}
          <TabsContent value="students">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Currently Enrolled', value: students.filter(s => s.status === 'Active').length, color: 'bg-green-50 text-green-700' },
                { label: 'Total Admitted (All Time)', value: students.length + archivedStudents.length, color: 'bg-blue-50 text-blue-700' },
                { label: 'Left School', value: archivedStudents.length, color: 'bg-red-50 text-red-700' },
                { label: 'Suspended/Withdrawn', value: students.filter(s => s.status !== 'Active').length, color: 'bg-orange-50 text-orange-700' },
              ].map((s, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className={`p-4 text-center rounded-xl ${s.color}`}>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Fee status per class */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader><CardTitle>Fee Payment Status by Class</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const classFee = {};
                  students.filter(s => s.status === 'Active').forEach(st => {
                    const cls = st.current_class;
                    if (!classFee[cls]) classFee[cls] = { total: 0, paid: 0, partial: 0, none: 0 };
                    classFee[cls].total++;
                    const payments = feePayments.filter(p => p.student_id === st.id && p.term === settings?.current_term);
                    if (payments.some(p => p.status === 'Paid')) classFee[cls].paid++;
                    else if (payments.some(p => p.status === 'Partial')) classFee[cls].partial++;
                    else classFee[cls].none++;
                  });
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b"><tr>{['Class', 'Total Students', 'Paid', 'Partial', 'Not Paid'].map(h => <th key={h} className="text-left px-3 py-2 text-xs">{h}</th>)}</tr></thead>
                        <tbody>
                          {Object.entries(classFee).map(([cls, f]) => (
                            <tr key={cls} className="border-b">
                              <td className="px-3 py-2 font-medium">{cls}</td>
                              <td className="px-3 py-2">{f.total}</td>
                              <td className="px-3 py-2 text-green-600 font-bold">{f.paid}</td>
                              <td className="px-3 py-2 text-yellow-600">{f.partial}</td>
                              <td className="px-3 py-2 text-red-600">{f.none}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Archived students (left school) */}
            {archivedStudents.length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader><CardTitle>Students Who Left School</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b"><tr>{['Name', 'Adm No', 'Last Class', 'Reason', 'Year'].map(h => <th key={h} className="text-left px-3 py-2 text-xs">{h}</th>)}</tr></thead>
                    <tbody>
                      {archivedStudents.slice(0, 50).map(s => (
                        <tr key={s.id} className="border-b">
                          <td className="px-3 py-2 font-medium">{s.first_name} {s.last_name}</td>
                          <td className="px-3 py-2 font-mono text-xs">{s.admission_number}</td>
                          <td className="px-3 py-2">{s.final_class}</td>
                          <td className="px-3 py-2"><Badge className="text-xs bg-red-100 text-red-700">{s.archive_reason}</Badge></td>
                          <td className="px-3 py-2 text-gray-500">{s.year_archived}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== STAFF TAB ===== */}
          <TabsContent value="staff">
            <Card className="border-0 shadow-md mb-4">
              <CardHeader><CardTitle>Teaching Staff ({teachers.length})</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b"><tr>{['Name', 'Role', 'Section', 'Salary', 'Bank', 'Account', 'Status'].map(h => <th key={h} className="text-left px-3 py-2 text-xs">{h}</th>)}</tr></thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{t.first_name} {t.last_name}</td>
                        <td className="px-3 py-2">{t.teacher_type}</td>
                        <td className="px-3 py-2">{t.section}</td>
                        <td className="px-3 py-2 font-bold text-green-700">{t.salary ? `₦${t.salary.toLocaleString()}` : 'Not set'}</td>
                        <td className="px-3 py-2 text-gray-500">{t.bank_name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{t.account_number || '—'}</td>
                        <td className="px-3 py-2"><Badge className={`text-xs ${t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{t.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle>Non-Academic Staff ({nonAcadStaff.length})</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b"><tr>{['Name', 'Role', 'Department', 'Salary', 'Bank', 'Account', 'Status'].map(h => <th key={h} className="text-left px-3 py-2 text-xs">{h}</th>)}</tr></thead>
                  <tbody>
                    {nonAcadStaff.map(s => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{s.first_name} {s.last_name}</td>
                        <td className="px-3 py-2">{s.role}</td>
                        <td className="px-3 py-2 text-gray-500">{s.department}</td>
                        <td className="px-3 py-2 font-bold text-green-700">{s.salary ? `₦${s.salary.toLocaleString()}` : 'Not set'}</td>
                        <td className="px-3 py-2 text-gray-500">{s.bank_name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{s.account_number || '—'}</td>
                        <td className="px-3 py-2"><Badge className={`text-xs ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PROJECTS TAB ===== */}
          <TabsContent value="projects">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">School Projects</h2>
              <Button className="bg-slate-800 hover:bg-slate-700" onClick={() => { setProjectDialog({}); setProjectForm({ status: 'Planned', sponsor_type: 'School', contractors: [], sponsors: [] }); }}>
                <Plus className="w-4 h-4 mr-2" />Add Project
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.length === 0 ? (
                <Card className="border-0 shadow-sm col-span-3">
                  <CardContent className="p-8 text-center text-gray-400">No projects yet</CardContent>
                </Card>
              ) : projects.map(p => (
                <Card key={p.id} className="border-0 shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">{p.project_name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{p.session} · {p.term}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={`text-xs ${p.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : p.status === 'Completed' ? 'bg-green-100 text-green-700' : p.status === 'Planned' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</Badge>
                        <button onClick={() => { setProjectDialog(p); setProjectForm(p); }}><Edit className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{p.description}</p>
                    <div className="space-y-1 text-xs text-gray-600 mb-3">
                      <div className="flex justify-between"><span>Total Cost:</span><span className="font-bold">₦{(p.total_cost || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Amount Paid:</span><span className="font-bold text-green-600">₦{(p.amount_paid || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Balance:</span><span className="font-bold text-red-500">₦{(p.balance || (p.total_cost - p.amount_paid) || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Sponsor:</span><span>{p.sponsor_type}</span></div>
                      {p.expected_completion && <div className="flex justify-between"><span>Expected:</span><span>{p.expected_completion}</span></div>}
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1"><span>Progress</span><span>{p.progress_percentage || 0}%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${p.progress_percentage || 0}%` }} />
                      </div>
                    </div>
                    {p.contractors?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-2">
                        <span className="font-medium">Contractors: </span>{p.contractors.map(c => c.name).join(', ')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ===== ACADEMIC TAB ===== */}
          <TabsContent value="academic">
            <Card className="border-0 shadow-md mb-4">
              <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" />Class Academic Performance</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const classPerf = {};
                  results.forEach(r => {
                    if (!r.class || !r.total) return;
                    if (!classPerf[r.class]) classPerf[r.class] = { totals: [], term: r.term, session: r.session };
                    classPerf[r.class].totals.push(r.total);
                  });
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b"><tr>{['Class', 'Avg Score', 'Records', 'Performance'].map(h => <th key={h} className="text-left px-3 py-2 text-xs">{h}</th>)}</tr></thead>
                        <tbody>
                          {Object.entries(classPerf).sort((a, b) => {
                            const avgA = a[1].totals.reduce((s, t) => s + t, 0) / a[1].totals.length;
                            const avgB = b[1].totals.reduce((s, t) => s + t, 0) / b[1].totals.length;
                            return avgB - avgA;
                          }).map(([cls, data]) => {
                            const avg = (data.totals.reduce((s, t) => s + t, 0) / data.totals.length).toFixed(1);
                            return (
                              <tr key={cls} className="border-b">
                                <td className="px-3 py-2 font-medium">{cls}</td>
                                <td className="px-3 py-2 font-bold">{avg}%</td>
                                <td className="px-3 py-2 text-gray-500">{data.totals.length}</td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                      <div className={`h-2 rounded-full ${Number(avg) >= 70 ? 'bg-green-500' : Number(avg) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Number(avg), 100)}%` }} />
                                    </div>
                                    <Badge className={`text-xs ${Number(avg) >= 70 ? 'bg-green-100 text-green-700' : Number(avg) >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{Number(avg) >= 70 ? 'Good' : Number(avg) >= 50 ? 'Average' : 'Needs Improvement'}</Badge>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== BROADCAST TAB ===== */}
          <TabsContent value="broadcast">
            <Card className="border-0 shadow-md max-w-2xl mx-auto">
              <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-blue-600" />Broadcast Message to All Staff</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <p>Messages sent here will be visible to all teaching and non-academic staff in the MICAS Chat system. Staff cannot message you back.</p>
                </div>
                <Textarea
                  placeholder="Type your broadcast message to all staff..."
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  rows={5}
                />
                {broadcastSent && <p className="text-green-600 text-sm font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" />Message broadcast successfully!</p>}
                <Button className="w-full bg-slate-800 hover:bg-slate-700" onClick={handleBroadcast} disabled={broadcastSending || !broadcastMsg.trim()}>
                  <Send className="w-4 h-4 mr-2" />{broadcastSending ? 'Sending...' : 'Send Broadcast'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== NOTIFICATIONS TAB ===== */}
          <TabsContent value="notifications">
            <Card className="border-0 shadow-md max-w-3xl mx-auto">
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-yellow-500" />Notifications</CardTitle></CardHeader>
              <CardContent className="p-0">
                {notifications.length === 0 ? (
                  <p className="p-8 text-center text-gray-400">No notifications yet</p>
                ) : notifications.map(n => (
                  <div key={n.id} className={`border-b p-4 flex items-start gap-3 ${n.read ? 'bg-white' : 'bg-yellow-50'}`}>
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-yellow-400'}`} />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                    </div>
                    {!n.read && (
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => markNotifRead(n.id)}>Mark read</button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* PAY SALARY DIALOG */}
      <Dialog open={!!salaryDialog} onOpenChange={() => setSalaryDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Pay Staff Salary</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Name *</Label>
              <Input value={salaryForm.staff_name || ''} onChange={e => setSalaryForm({ ...salaryForm, staff_name: e.target.value })} placeholder="Full name" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Input value={salaryForm.role || ''} onChange={e => setSalaryForm({ ...salaryForm, role: e.target.value })} placeholder="e.g. Teacher" className="mt-1" />
              </div>
              <div>
                <Label>Month *</Label>
                <Input value={salaryForm.month || ''} onChange={e => setSalaryForm({ ...salaryForm, month: e.target.value })} placeholder="e.g. July 2026" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₦) *</Label>
                <Input type="number" value={salaryForm.amount || ''} onChange={e => setSalaryForm({ ...salaryForm, amount: parseFloat(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={salaryForm.payment_method || 'Bank Transfer'} onValueChange={v => setSalaryForm({ ...salaryForm, payment_method: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bank Name</Label>
                <Input value={salaryForm.bank_name || ''} onChange={e => setSalaryForm({ ...salaryForm, bank_name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input value={salaryForm.account_number || ''} onChange={e => setSalaryForm({ ...salaryForm, account_number: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Term</Label>
              <Select value={salaryForm.term || settings?.current_term || ''} onValueChange={v => setSalaryForm({ ...salaryForm, term: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={salaryForm.notes || ''} onChange={e => setSalaryForm({ ...salaryForm, notes: e.target.value })} rows={2} className="mt-1" />
            </div>
            <Button className="w-full bg-slate-800 hover:bg-slate-700" onClick={handlePaySalary} disabled={salarySaving || !salaryForm.staff_name || !salaryForm.amount}>
              {salarySaving ? 'Processing...' : 'Confirm & Pay Salary'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PROJECT DIALOG */}
      <Dialog open={!!projectDialog} onOpenChange={() => setProjectDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{projectDialog?.id ? 'Edit Project' : 'Add New Project'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Name *</Label>
              <Input value={projectForm.project_name || ''} onChange={e => setProjectForm({ ...projectForm, project_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={projectForm.description || ''} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={projectForm.status || 'Planned'} onValueChange={v => setProjectForm({ ...projectForm, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Planned', 'Ongoing', 'Completed', 'Suspended'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sponsor Type</Label>
                <Select value={projectForm.sponsor_type || 'School'} onValueChange={v => setProjectForm({ ...projectForm, sponsor_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="School">School</SelectItem>
                    <SelectItem value="External">External</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Total Cost (₦)</Label>
                <Input type="number" value={projectForm.total_cost || ''} onChange={e => setProjectForm({ ...projectForm, total_cost: parseFloat(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label>Amount Paid (₦)</Label>
                <Input type="number" value={projectForm.amount_paid || ''} onChange={e => setProjectForm({ ...projectForm, amount_paid: parseFloat(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label>Progress (%)</Label>
                <Input type="number" min="0" max="100" value={projectForm.progress_percentage || ''} onChange={e => setProjectForm({ ...projectForm, progress_percentage: parseInt(e.target.value) })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={projectForm.start_date || ''} onChange={e => setProjectForm({ ...projectForm, start_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Expected Completion</Label>
                <Input type="date" value={projectForm.expected_completion || ''} onChange={e => setProjectForm({ ...projectForm, expected_completion: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Progress Notes</Label>
              <Textarea value={projectForm.progress_notes || ''} onChange={e => setProjectForm({ ...projectForm, progress_notes: e.target.value })} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Contractor Name(s) (comma-separated)</Label>
              <Input value={(projectForm.contractors || []).map(c => c.name).join(', ')} onChange={e => setProjectForm({ ...projectForm, contractors: e.target.value.split(',').filter(Boolean).map(n => ({ name: n.trim() })) })} className="mt-1" placeholder="e.g. ABC Construction, XYZ Builders" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Term</Label>
                <Select value={projectForm.term || ''} onValueChange={v => setProjectForm({ ...projectForm, term: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Input value={projectForm.session || ''} onChange={e => setProjectForm({ ...projectForm, session: e.target.value })} placeholder="e.g. 2025/2026" className="mt-1" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setProjectDialog(null)}>Cancel</Button>
              <Button className="flex-1 bg-slate-800 hover:bg-slate-700" onClick={handleSaveProject} disabled={projectSaving}>
                {projectSaving ? 'Saving...' : 'Save Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}