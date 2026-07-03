import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  DollarSign, Receipt, Users, AlertCircle, 
  TrendingUp, LogOut, Plus, BarChart3, Eye, EyeOff,
  GraduationCap, CheckCircle, XCircle, FileText, Printer,
  Search, Download
} from 'lucide-react';
import { generateAdmissionLetterPDF } from '@/lib/admissionLetterPDF';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';

export default function AccountantPortal() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [accountant, setAccountant] = useState(null);
  const [stats, setStats] = useState({});
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Login state
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);

  // Admissions
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Final admission dialog
  const [admissionDialog, setAdmissionDialog] = useState(null);
  const [testScore, setTestScore] = useState('');
  const [finalClass, setFinalClass] = useState('');
  const [admissionProcessing, setAdmissionProcessing] = useState(false);
  const [printLetter, setPrintLetter] = useState(null);
  const [tuitionFee, setTuitionFee] = useState('');
  const [resumptionDate, setResumptionDate] = useState('');

  useEffect(() => {
    const session = sessionStorage.getItem('accountant_portal_logged_in');
    if (session === 'true') {
      const saved = JSON.parse(sessionStorage.getItem('accountant_data') || '{}');
      setAccountant(saved);
      setLoggedIn(true);
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async () => {
    if (!staffId || !password) { setLoginError('Please enter username and password'); return; }
    setLoginLoading(true);
    setLoginError('');
    let staff = await base44.entities.NonAcademicStaff.filter({ staff_id: staffId.trim(), role: 'Accountant' });
    if (!staff[0]) {
      staff = await base44.entities.NonAcademicStaff.filter({ email: staffId.trim(), role: 'Accountant' });
    }
    if (!staff[0]) { setLoginError('Invalid username or password.'); setLoginLoading(false); return; }
    const expectedPassword = staff[0].custom_password || 'admin220';
    if (password !== expectedPassword) {
      setLoginError('Invalid username or password.'); setLoginLoading(false); return;
    }
    sessionStorage.setItem('accountant_portal_logged_in', 'true');
    sessionStorage.setItem('accountant_data', JSON.stringify(staff[0]));
    setAccountant(staff[0]);
    setLoggedIn(true);
    setLoginLoading(false);
    loadDashboard();
  };

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    const [payments, students] = await Promise.all([
      base44.entities.SchoolFeePayment.list('-created_date', 10),
      base44.entities.Student.list()
    ]);
    setRecentPayments(payments);
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = payments.filter(p => p.payment_date === today);
    const todayTotal = todayPayments.reduce((s, p) => s + (p.amount_paid || 0), 0);
    setStats({
      totalStudents: students.length,
      todayPayments: todayPayments.length,
      todayTotal,
      recentCount: payments.length
    });
    setLoading(false);
  };

  const loadApplications = async () => {
    setAppsLoading(true);
    const apps = await base44.entities.AdmissionApplication.list('-created_date', 100);
    setApplications(apps);
    setAppsLoading(false);
  };

  const handleTabChange = (tab) => {
    if (tab === 'admissions') loadApplications();
    if (tab === 'receipts') loadDashboard(true);
  };

  const handleOfferAdmission = async (app) => {
    setReviewLoading(true);
    await base44.entities.AdmissionApplication.update(app.id, {
      status: 'Offered Admission',
      admin_notes: reviewNotes || undefined
    });
    // Notify applicant by email
    if (app.parent_email) {
      const appName = `${app.first_name} ${app.last_name}`;
      await base44.integrations.Core.SendEmail({
        to: app.parent_email,
        subject: `Admission Offer — ${appName} | Ref: ${app.application_number}`,
        body: `Dear ${app.parent_name},\n\nCONGRATULATIONS!\n\nWe are pleased to inform you that ${appName} has been offered provisional admission to Milton College of Arts and Science, Kaduna.\n\nApplication Number: ${app.application_number}\nClass Applied For: ${app.class_applying}\n\nPlease visit our website and enter your application number (${app.application_number}) to accept or reject this offer.\n\nIMPORTANT: You must accept or reject this offer within 7 days.\n\nWarm regards,\nAdmissions Office\nMilton College of Arts and Science, Kaduna`,
        from_name: 'Milton College Admissions'
      }).catch(() => {});
    }
    setSelectedApp(null);
    setReviewNotes('');
    setReviewLoading(false);
    loadApplications();
  };

  const handleRejectApplication = async (app) => {
    if (!confirm('Reject this application?')) return;
    setReviewLoading(true);
    await base44.entities.AdmissionApplication.update(app.id, {
      status: 'Rejected',
      admin_notes: reviewNotes || undefined
    });
    if (app.parent_email) {
      await base44.integrations.Core.SendEmail({
        to: app.parent_email,
        subject: `Admission Application Update — ${app.application_number}`,
        body: `Dear ${app.parent_name},\n\nWe regret to inform you that the application for ${app.first_name} ${app.last_name} (Ref: ${app.application_number}) has not been successful at this time.\n\nIf you have any questions, please contact our admissions office.\n\nWarm regards,\nMilton College of Arts and Science, Kaduna`,
        from_name: 'Milton College Admissions'
      }).catch(() => {});
    }
    setSelectedApp(null);
    setReviewNotes('');
    setReviewLoading(false);
    loadApplications();
  };

  const handleFinalAdmission = async () => {
    if (!admissionDialog || !testScore || !finalClass) {
      alert('Please fill in test score and final class.'); return;
    }
    if (!tuitionFee) {
      alert('Please enter the tuition fee for the selected class.'); return;
    }
    if (!resumptionDate) {
      alert('Please enter the resumption date.'); return;
    }
    setAdmissionProcessing(true);
    const app = admissionDialog;
    const appName = `${app.first_name} ${app.last_name}`;

    // Generate admission number following existing pattern
    const existingStudents = await base44.entities.Student.list('-created_date', 5);
    let newAdmNum = app.admission_number_generated;
    if (!newAdmNum) {
      // Follow existing admission number pattern from database
      const lastAdmNum = existingStudents[0]?.admission_number;
      if (lastAdmNum && lastAdmNum.match(/\d+/)) {
        const numPart = parseInt(lastAdmNum.match(/\d+/)[0]) + 1;
        const prefix = lastAdmNum.replace(/\d+/, '');
        newAdmNum = prefix + String(numPart).padStart(lastAdmNum.match(/\d+/)[0].length, '0');
      } else {
        newAdmNum = 'STU' + Date.now().toString().slice(-6);
      }
    }

    const admDate = new Date().toISOString().split('T')[0];

    // Create student record permanently in database
    await base44.entities.Student.create({
      admission_number: newAdmNum,
      first_name: app.first_name,
      last_name: app.last_name,
      middle_name: app.middle_name || '',
      date_of_birth: app.date_of_birth,
      gender: app.gender,
      passport_photo: app.passport_photo || '',
      section: app.section_applying,
      current_class: finalClass,
      state_of_origin: app.state_of_origin || '',
      local_government: app.local_government || '',
      address: app.address || '',
      parent_name: app.parent_name,
      parent_phone: app.parent_phone,
      parent_email: app.parent_email || '',
      admission_date: admDate,
      status: 'Active'
    });

    // Update application record
    await base44.entities.AdmissionApplication.update(app.id, {
      status: 'Admitted',
      test_score: parseFloat(testScore),
      final_class_admitted: finalClass,
      admission_number_generated: newAdmNum,
      admission_letter_sent: true,
      student_record_created: true,
      tuition_fee: parseFloat(tuitionFee),
      resumption_date: resumptionDate
    });

    // Generate admission letter PDF (matching the official template)
    let pdfUrl = null;
    try {
      const settingsRec = await base44.entities.SchoolSettings.list();
      const schoolLogo = settingsRec[0]?.school_logo || null;

      const doc = generateAdmissionLetterPDF({
        candidateName: appName,
        admissionNumber: newAdmNum,
        address: app.address || '',
        section: app.section_applying,
        classAdmitted: finalClass,
        tuitionFee: tuitionFee,
        resumptionDate: resumptionDate,
        date: admDate,
        schoolLogo
      });

      // Upload PDF to get a permanent URL
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `admission-letter-${newAdmNum}.pdf`, { type: 'application/pdf' });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      pdfUrl = uploadRes.file_url;

      // Save PDF URL to the application record
      await base44.entities.AdmissionApplication.update(app.id, {
        admission_letter_pdf_url: pdfUrl
      });
    } catch (e) {
      console.error('PDF generation error:', e);
    }

    // Send admission letter by email with PDF link
    if (app.parent_email) {
      const emailBody = `Dear ${app.parent_name},

CONGRATULATIONS! ${appName} has been officially admitted into Milton College of Arts and Science, Kaduna.

ADMISSION DETAILS:
Admission Number: ${newAdmNum}
Full Name: ${appName}
Class Admitted: ${finalClass}
Section: ${app.section_applying}
Admission Date: ${admDate}
Tuition Fee: \u20A6${parseFloat(tuitionFee).toLocaleString()}
Resumption Date: ${resumptionDate}

Your official Admission Letter (PDF) is available at the link below:
${pdfUrl || 'Please contact the school for your admission letter.'}

Please download and print the admission letter. Bring it along when reporting for registration.

Warm regards,
The Principal
Milton College of Arts and Science, Kaduna`;

      await base44.integrations.Core.SendEmail({
        to: app.parent_email,
        subject: `ADMISSION LETTER — ${appName} | Adm. No: ${newAdmNum}`,
        body: emailBody,
        from_name: 'Milton College of Arts & Science'
      }).catch(() => {});
    }

    setPrintLetter({ app, newAdmNum, finalClass, testScore, admDate, pdfUrl });
    setAdmissionDialog(null);
    setTestScore('');
    setFinalClass('');
    setTuitionFee('');
    setResumptionDate('');
    setAdmissionProcessing(false);
    loadApplications();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('accountant_portal_logged_in');
    sessionStorage.removeItem('accountant_data');
    setLoggedIn(false);
    setAccountant(null);
    setStaffId('');
    setPassword('');
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <div className="bg-emerald-600 rounded-t-xl p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Accountant Portal</h1>
            <p className="text-white/80 text-sm mt-1">Milton College of Arts & Science</p>
          </div>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Username</Label>
              <Input placeholder="Enter your username" value={staffId}
                onChange={e => setStaffId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="pr-10" />
                <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <button type="button" className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium" onClick={() => setShowForgotPw(true)}>
              Forgot Password?
            </button>
          </CardContent>
        </Card>
        <ForgotPasswordDialog
          open={showForgotPw}
          onOpenChange={setShowForgotPw}
          entityType="NonAcademicStaff"
          identifierField="staff_id"
          identifierLabel="Staff ID"
          phoneField="phone"
          extraFilter={{ role: 'Accountant' }}
          themeColor="bg-emerald-600"
        />
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full" />
    </div>
  );

  const quickActions = [
    { label: 'New Receipt', icon: Plus, to: '/FeeReceipt', color: 'bg-green-600' },
    { label: 'Manage Receipts', icon: Search, to: '/ReceiptManagement', color: 'bg-teal-600' },
    { label: 'Fee Payments', icon: DollarSign, to: '/FeePayments', color: 'bg-blue-600' },
    { label: 'Fee Defaulters', icon: AlertCircle, to: '/FeeDefaulters', color: 'bg-red-600' },
  ];

  const statusColor = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Under Review': 'bg-blue-100 text-blue-800',
    'Offered Admission': 'bg-green-100 text-green-800',
    'Accepted': 'bg-emerald-100 text-emerald-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Admitted': 'bg-purple-100 text-purple-800',
  };

  const CLASSES_ALL = ['Reception Class', 'Nursery 1', 'Nursery 2', 'Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B', 'JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-7 h-7" />
            <div>
              <h1 className="text-xl font-bold">Accountant Portal</h1>
              <p className="text-sm text-white/70">{accountant?.first_name} {accountant?.last_name}</p>
            </div>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="admissions">Admissions</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Today's Payments", value: stats.todayPayments || 0, icon: Receipt, color: 'text-green-600' },
                { label: "Today's Revenue", value: `₦${(stats.todayTotal || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600' },
                { label: 'Total Students', value: stats.totalStudents || 0, icon: Users, color: 'text-purple-600' },
                { label: 'Recent Transactions', value: stats.recentCount || 0, icon: BarChart3, color: 'text-orange-600' },
              ].map((s, i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{s.label}</p>
                      <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </div>
                    <s.icon className={`w-8 h-8 ${s.color} opacity-70`} />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-md mb-8">
              <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {quickActions.map((a, i) => (
                    <Link key={i} to={a.to}>
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className={`w-12 h-12 ${a.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <a.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 text-center">{a.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
              <CardContent className="p-0">
                {recentPayments.length === 0 ? (
                  <p className="p-6 text-center text-gray-400">No payments yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Receipt #', 'Student', 'Class', 'Term', 'Amount', 'Method', 'Date', 'Status'].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recentPayments.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono">{p.receipt_number}</td>
                            <td className="px-4 py-3 font-medium text-sm">{p.student_name}</td>
                            <td className="px-4 py-3 text-sm">{p.class}</td>
                            <td className="px-4 py-3 text-sm">{p.term}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-700">₦{(p.amount_paid || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">{p.payment_method}</td>
                            <td className="px-4 py-3 text-sm">{p.payment_date}</td>
                            <td className="px-4 py-3">
                              <Badge variant={p.status === 'Paid' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RECEIPTS TAB */}
          <TabsContent value="receipts">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    Receipt Management
                  </CardTitle>
                  <Link to="/ReceiptManagement">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Search className="w-3 h-3 mr-1" />Full Search & Reports
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentPayments.length === 0 ? (
                  <p className="p-8 text-center text-gray-400">No receipts yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Receipt #', 'Student', 'Class', 'Amount', 'Method', 'Date', 'Status'].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recentPayments.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono">{p.receipt_number}</td>
                            <td className="px-4 py-3 font-medium text-sm">{p.student_name}</td>
                            <td className="px-4 py-3 text-sm">{p.class}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-700">{(p.amount_paid || 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</td>
                            <td className="px-4 py-3 text-sm">{p.payment_method}</td>
                            <td className="px-4 py-3 text-sm">{p.payment_date}</td>
                            <td className="px-4 py-3">
                              <Badge variant={p.status === 'Paid' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="p-4 bg-gray-50 border-t flex gap-3 flex-wrap">
                  <Link to="/ReceiptManagement"><Button size="sm" variant="outline"><Search className="w-3 h-3 mr-1" />Search & Reprint Receipts</Button></Link>
                  <Link to="/ReceiptManagement"><Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" />Download Transaction Report (PDF)</Button></Link>
                  <Link to="/FeeReceipt"><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" />New Receipt</Button></Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADMISSIONS TAB */}
          <TabsContent value="admissions">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                    Admission Applications
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={loadApplications} disabled={appsLoading}>
                    {appsLoading ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {appsLoading ? (
                  <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" /></div>
                ) : applications.length === 0 ? (
                  <p className="p-8 text-center text-gray-400">No applications yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['App. No', 'Applicant', 'Section', 'Class', 'Date', 'Status', 'Actions'].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {applications.map(app => (
                          <tr key={app.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs">{app.application_number}</td>
                            <td className="px-4 py-3 font-medium">{app.first_name} {app.last_name}</td>
                            <td className="px-4 py-3">{app.section_applying}</td>
                            <td className="px-4 py-3">{app.class_applying}</td>
                            <td className="px-4 py-3 text-gray-500">{app.application_date}</td>
                            <td className="px-4 py-3">
                              <Badge className={`text-xs ${statusColor[app.status] || 'bg-gray-100 text-gray-700'}`}>{app.status}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" onClick={() => { setSelectedApp(app); setReviewNotes(app.admin_notes || ''); }}>
                                  <Eye className="w-3 h-3 mr-1" />Review
                                </Button>
                                {app.status === 'Accepted' && (
                                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setAdmissionDialog(app); setFinalClass(app.class_applying); }}>
                                    <FileText className="w-3 h-3 mr-1" />Final Admit
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* REVIEW APPLICATION DIALOG */}
      <Dialog open={!!selectedApp} onOpenChange={() => { setSelectedApp(null); setReviewNotes(''); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application — {selectedApp?.application_number}</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Full Name</p><p className="font-semibold">{selectedApp.first_name} {selectedApp.middle_name} {selectedApp.last_name}</p></div>
                <div><p className="text-gray-500">Date of Birth</p><p className="font-semibold">{selectedApp.date_of_birth}</p></div>
                <div><p className="text-gray-500">Gender</p><p className="font-semibold">{selectedApp.gender}</p></div>
                <div><p className="text-gray-500">Section / Class</p><p className="font-semibold">{selectedApp.section_applying} / {selectedApp.class_applying}</p></div>
                <div><p className="text-gray-500">Former School</p><p className="font-semibold">{selectedApp.former_school_name}</p></div>
                <div><p className="text-gray-500">State of Origin</p><p className="font-semibold">{selectedApp.state_of_origin}</p></div>
                <div><p className="text-gray-500">Parent/Guardian</p><p className="font-semibold">{selectedApp.parent_name}</p></div>
                <div><p className="text-gray-500">Parent Phone</p><p className="font-semibold">{selectedApp.parent_phone}</p></div>
                <div><p className="text-gray-500">Parent Email</p><p className="font-semibold">{selectedApp.parent_email || 'N/A'}</p></div>
                <div><p className="text-gray-500">Health Conditions</p><p className="font-semibold">{selectedApp.health_conditions || 'None'}</p></div>
              </div>
              {selectedApp.passport_photo && (
                <div><p className="text-gray-500 text-sm mb-1">Passport Photo</p><img src={selectedApp.passport_photo} alt="passport" className="w-24 h-24 object-cover rounded-lg border" /></div>
              )}
              <div>
                <Label>Admin Notes</Label>
                <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3} placeholder="Optional notes..." className="mt-1" />
              </div>
              <div className="flex gap-3 flex-wrap">
                {selectedApp.status === 'Pending' || selectedApp.status === 'Under Review' ? (
                  <>
                    <Button onClick={() => handleOfferAdmission(selectedApp)} disabled={reviewLoading} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />{reviewLoading ? 'Processing...' : 'Offer Admission'}
                    </Button>
                    <Button onClick={() => handleRejectApplication(selectedApp)} disabled={reviewLoading} variant="outline" className="border-red-300 text-red-600">
                      <XCircle className="w-4 h-4 mr-2" />Reject
                    </Button>
                  </>
                ) : (
                  <Badge className={`text-sm px-3 py-1 ${statusColor[selectedApp.status] || ''}`}>{selectedApp.status}</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FINAL ADMISSION DIALOG (after physical test) */}
      <Dialog open={!!admissionDialog} onOpenChange={() => { setAdmissionDialog(null); setTestScore(''); setFinalClass(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Final Admission — {admissionDialog?.application_number}</DialogTitle>
          </DialogHeader>
          {admissionDialog && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Enter the physical test results for <strong>{admissionDialog.first_name} {admissionDialog.last_name}</strong> to generate and send their admission letter.</p>
              <div>
                <Label>Test Score (%)</Label>
                <Input type="number" value={testScore} onChange={e => setTestScore(e.target.value)} placeholder="e.g. 75" className="mt-1" />
              </div>
              <div>
                <Label>Final Class to be Admitted Into</Label>
                <select value={finalClass} onChange={e => setFinalClass(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 text-sm">
                  <option value="">Select class</option>
                  {CLASSES_ALL.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Tuition Fee for {finalClass || 'Selected Class'} *</Label>
                <Input type="number" value={tuitionFee} onChange={e => setTuitionFee(e.target.value)} placeholder="e.g. 150000" className="mt-1" />
              </div>
              <div>
                <Label>Resumption Date *</Label>
                <Input type="date" value={resumptionDate} onChange={e => setResumptionDate(e.target.value)} className="mt-1" />
              </div>
              <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                Upon confirmation, the system will: generate an admission letter (PDF), email it to the parent, generate an admission number, and permanently save the student record in the database.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleFinalAdmission} disabled={admissionProcessing} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  {admissionProcessing ? 'Processing...' : 'Confirm & Generate Admission Letter'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PRINT ADMISSION LETTER */}
      {printLetter && (
        <Dialog open={!!printLetter} onOpenChange={() => setPrintLetter(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Admission Letter — PDF Generated</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Student record saved permanently. Admission letter (PDF) emailed to {printLetter.app.parent_email || 'parent'}.
              </div>
              {printLetter.pdfUrl && (
                <div className="border rounded-lg overflow-hidden">
                  <iframe src={printLetter.pdfUrl} className="w-full" style={{ height: '500px' }} title="Admission Letter PDF" />
                </div>
              )}
              <div className="flex gap-3">
                {printLetter.pdfUrl && (
                  <a href={printLetter.pdfUrl} download={`admission-letter-${printLetter.newAdmNum}.pdf`} className="flex-1">
                    <Button className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                      <Download className="w-4 h-4 mr-2" />Download PDF
                    </Button>
                  </a>
                )}
                {printLetter.pdfUrl && (
                  <a href={printLetter.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Printer className="w-4 h-4 mr-2" />Print / Open
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}