import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const CLASSES = {
  'Nursery': ['Pre-Nursery', 'Nursery 1', 'Nursery 2', 'Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

const REQUIREMENTS = {
  nursery: {
    label: 'Pre-Nursery to Nursery 2',
    fees: [
      { item: 'Tuition fee', amount: 15000 },
      { item: 'Admission form', amount: 2000 },
      { item: 'Examination fee', amount: 1000 },
      { item: 'Registration', amount: 2000 },
      { item: 'P.T.A Levy', amount: 500 },
      { item: 'Lesson fee', amount: 1000 },
      { item: 'Badges', amount: 500 },
    ],
    total: 22000,
    subsequently: 17500,
    items: [
      'Two office files',
      'Two Passport photographs',
      'Two antiseptic Soaps',
      'Two toilet paper',
      'One Izal/Bleach (small size)',
      'One Dettol',
      'Detergent (Omo)',
    ]
  },
  primary: {
    label: 'Primary 1 to Primary 5',
    fees: [
      { item: 'Tuition fee', amount: 18500 },
      { item: 'Admission form', amount: 2000 },
      { item: 'Examination fee', amount: 1000 },
      { item: 'Registration', amount: 2000 },
      { item: 'P.T.A Levy', amount: 500 },
      { item: 'Lesson fee', amount: 1000 },
      { item: 'Badges', amount: 500 },
    ],
    total: 25500,
    subsequently: 21000,
    items: [
      'Two office files',
      'Two Passport photographs',
      'Two antiseptic Soaps',
      'Two toilet paper',
      'One Izal/Bleach (small size)',
      'One Dettol',
      'Detergent (Omo)',
    ]
  },
  jss: {
    label: 'JSS1 to JSS3',
    fees: [
      { item: 'Tuition fee', amount: 30500 },
      { item: 'Admission form', amount: 2000 },
      { item: 'Examination fee', amount: 1000 },
      { item: 'Registration', amount: 2000 },
      { item: 'P.T.A Levy', amount: 1000 },
      { item: 'Lesson fee', amount: 1000 },
      { item: 'Badges', amount: 500 },
      { item: 'Practical fee', amount: 1000 },
      { item: 'Medical fee', amount: 1000 },
    ],
    total: 40000,
    subsequently: 33000,
    items: [
      'Two office files',
      'Two Passport photographs',
      'Two hoes',
      'Two brooms',
      'Two cutlasses',
      'Two antiseptic Soaps',
      'Two toilet paper',
      'One Izal/Bleach (small size)',
      'One Dettol',
    ]
  },
  sss: {
    label: 'SS1 to SS3',
    fees: [
      { item: 'Tuition fee', amount: 36500 },
      { item: 'Admission form', amount: 2000 },
      { item: 'Examination fee', amount: 1000 },
      { item: 'Registration', amount: 2000 },
      { item: 'P.T.A Levy', amount: 1000 },
      { item: 'Lesson fee', amount: 1000 },
      { item: 'Badges', amount: 500 },
      { item: 'Practical fee', amount: 1000 },
      { item: 'Medical fee', amount: 1000 },
    ],
    total: 46000,
    subsequently: 39000,
    items: [
      'Two office files',
      'Two Passport photographs',
      'Two hoes',
      'Two brooms',
      'Two cutlasses',
      'Two antiseptic Soaps',
      'Two toilet paper',
      'One Izal/Bleach (small size)',
      'One Dettol',
    ]
  }
};

function getRequirementKey(section, cls) {
  if (!section || !cls) return null;
  if (section === 'Nursery') return 'nursery';
  if (section === 'Primary') return 'primary';
  if (section === 'Secondary') {
    if (cls.startsWith('JSS')) return 'jss';
    return 'sss';
  }
  return null;
}

export default function AdmissionRequirements() {
  const navigate = useNavigate();
  const [section, setSection] = useState('');
  const [cls, setCls] = useState('');
  const [agreed, setAgreed] = useState(false);

  const reqKey = getRequirementKey(section, cls);
  const req = reqKey ? REQUIREMENTS[reqKey] : null;

  const handleProceed = () => {
    if (!section || !cls) { alert('Please select section and class first.'); return; }
    if (!agreed) { alert('Please read and accept the requirements before proceeding.'); return; }
    navigate(`/AdmissionForm?section=${encodeURIComponent(section)}&class=${encodeURIComponent(cls)}`);
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
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Admission Requirements</h1>
              <p className="text-blue-200">Milton College of Arts and Science, Kaduna</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Section & Class Selection */}
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-[#1e3a5f]">Step 1: Select Section & Class</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Section Applying For *</Label>
                <Select value={section} onValueChange={v => { setSection(v); setCls(''); setAgreed(false); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nursery">Nursery</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class Applying For *</Label>
                <Select value={cls} onValueChange={v => { setCls(v); setAgreed(false); }} disabled={!section}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {section && CLASSES[section]?.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements Display */}
        {req && (
          <Card className="border-0 shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f]">Requirements & Instructions — {req.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Compulsory Fees */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">New Intake (Compulsory Fees)</h3>
                <div className="space-y-2">
                  {req.fees.map((f, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">{f.item}</span>
                      <span className="font-semibold text-gray-900">₦{f.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2 bg-[#1e3a5f] text-white px-3 rounded-lg mt-3">
                    <span className="font-bold">Total (New Intake)</span>
                    <span className="font-bold text-lg">₦{req.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-blue-50 px-3 rounded-lg">
                    <span className="font-semibold text-blue-800">Subsequently (Returning)</span>
                    <span className="font-bold text-blue-800">₦{req.subsequently.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Compulsory Items */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">New Intake (Compulsory Items)</h3>
                <ul className="space-y-2">
                  {req.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Agreement */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 mb-3 font-medium">
                  Please read all the requirements above carefully before proceeding. By checking the box below, you confirm that you have read, understood, and agree to all the requirements and instructions for admission.
                </p>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={setAgreed}
                    className="mt-0.5"
                  />
                  <label htmlFor="agree" className="text-sm text-amber-900 cursor-pointer font-medium">
                    I have read and understood all the requirements and instructions above. I agree to comply with all the stated conditions for admission.
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Also show a check status link */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleProceed}
            disabled={!req || !agreed}
            className="flex-1 bg-[#1e3a5f] hover:bg-[#2c4a6e] h-12 text-base"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            I Agree — Proceed to Fill Admission Form
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => navigate('/CheckAdmissionStatus')}
          >
            Check Application Status
          </Button>
        </div>
      </div>
    </div>
  );
}