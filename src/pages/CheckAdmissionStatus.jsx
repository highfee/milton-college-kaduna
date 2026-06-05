import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, GraduationCap, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CheckAdmissionStatus() {
  const [appNum, setAppNum] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [done, setDone] = useState('');

  const handleSearch = async () => {
    if (!appNum.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setDone('');
    const apps = await base44.entities.AdmissionApplication.filter({ application_number: appNum.trim().toUpperCase() });
    if (!apps[0]) { setNotFound(true); setLoading(false); return; }
    setResult(apps[0]);
    setLoading(false);
  };

  const handleAcceptOffer = async () => {
    if (!result) return;
    setAccepting(true);
    const appName = `${result.first_name} ${result.last_name}`;
    const admNum = result.admission_number_generated || `ADM${Date.now().toString().slice(-6)}`;

    await base44.entities.AdmissionApplication.update(result.id, {
      status: 'Accepted',
      acceptance_sent: true,
      admission_number_generated: admNum
    });

    // Send acceptance letter via email
    if (result.parent_email) {
      const letterBody = `
Dear Parent/Guardian of ${appName},

CONGRATULATIONS! We are pleased to inform you that ${appName} has been offered provisional admission to Milton College of Arts and Science, Kaduna.

Application Number: ${result.application_number}
Class Applied For: ${result.class_applying}
Section: ${result.section_applying}

IMPORTANT INSTRUCTIONS:
1. ${appName} is required to come to the school for academic testing of the class applied for.
2. This acceptance letter does NOT in any way connote that ${appName} is admitted into the desired class until the test is conducted.
3. Please bring this letter along with all required items and fees upon reporting to the school.

Please report to the school's administrative office with this letter.

Warm regards,
Milton College of Arts and Science, Kaduna
Admissions Office
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: result.parent_email,
        subject: `Admission Offer — ${appName} | Application No: ${result.application_number}`,
        body: letterBody,
        from_name: 'Milton College Admissions'
      });
    }

    setResult({ ...result, status: 'Accepted', acceptance_sent: true });
    setDone('accepted');
    setAccepting(false);
  };

  const handleRejectOffer = async () => {
    if (!result) return;
    if (!confirm('Are you sure you want to reject this admission offer?')) return;
    setRejecting(true);
    await base44.entities.AdmissionApplication.update(result.id, { status: 'Rejected' });
    setResult({ ...result, status: 'Rejected' });
    setDone('rejected');
    setRejecting(false);
  };

  const statusConfig = {
    'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Your application is pending review by our admissions office.' },
    'Under Review': { color: 'bg-blue-100 text-blue-800', icon: AlertCircle, text: 'Your application is currently being reviewed.' },
    'Offered Admission': { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Congratulations! You have been offered admission. Please accept or reject below.' },
    'Accepted': { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, text: 'You have accepted the admission offer. Please check your email for the acceptance letter and report to school for academic testing.' },
    'Rejected': { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'This application has been rejected.' },
    'Admitted': { color: 'bg-purple-100 text-purple-800', icon: GraduationCap, text: 'Congratulations! You have been fully admitted. Please check your email for your admission letter.' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2c4a6e] text-white py-8">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Check Admission Status</h1>
              <p className="text-blue-200">Milton College of Arts and Science, Kaduna</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <p className="text-gray-600 mb-4 text-sm">Enter your application number to check the status of your admission application.</p>
            <div className="flex gap-3">
              <Input
                placeholder="Enter Application Number (e.g. APP12345678)"
                value={appNum}
                onChange={e => setAppNum(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                <Search className="w-4 h-4 mr-2" />{loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {notFound && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="font-medium text-gray-700">Application not found</p>
              <p className="text-sm text-gray-500 mt-1">Please check your application number and try again.</p>
            </CardContent>
          </Card>
        )}

        {result && (() => {
          const cfg = statusConfig[result.status] || statusConfig['Pending'];
          const Icon = cfg.icon;
          return (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#1e3a5f]">
                  <GraduationCap className="w-5 h-5" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Application No.</p><p className="font-bold font-mono">{result.application_number}</p></div>
                  <div><p className="text-gray-500">Applicant Name</p><p className="font-semibold">{result.first_name} {result.middle_name} {result.last_name}</p></div>
                  <div><p className="text-gray-500">Class Applied For</p><p className="font-semibold">{result.class_applying}</p></div>
                  <div><p className="text-gray-500">Section</p><p className="font-semibold">{result.section_applying}</p></div>
                  <div><p className="text-gray-500">Application Date</p><p className="font-semibold">{result.application_date}</p></div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge className={`${cfg.color} text-xs`}>{result.status}</Badge>
                  </div>
                </div>

                <div className={`p-4 rounded-lg flex items-start gap-3 ${cfg.color}`}>
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium">{cfg.text}</p>
                </div>

                {/* Offer buttons */}
                {result.status === 'Offered Admission' && done === '' && (
                  <div className="border-t pt-4">
                    <p className="font-semibold text-gray-800 mb-3">🎉 Congratulations! You have been offered admission. Please select an option:</p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleAcceptOffer}
                        disabled={accepting || rejecting}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {accepting ? 'Processing...' : 'Accept Admission'}
                      </Button>
                      <Button
                        onClick={handleRejectOffer}
                        disabled={accepting || rejecting}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {rejecting ? 'Processing...' : 'Reject Offer'}
                      </Button>
                    </div>
                  </div>
                )}

                {done === 'accepted' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    You have accepted the admission offer. An acceptance letter has been sent to <strong>{result.parent_email}</strong>. Please report to school for academic testing.
                  </div>
                )}
                {done === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                    You have rejected the admission offer. If this was a mistake, please contact the school.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        <div className="text-center mt-6">
          <Link to="/AdmissionRequirements">
            <Button variant="outline">Apply for Admission</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}