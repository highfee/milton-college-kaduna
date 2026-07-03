import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, CheckCircle, GraduationCap, User, MapPin, Users, Camera, Mail, BadgeCheck, ShieldCheck } from 'lucide-react';
import { generateApplicationFormPDF } from '@/lib/applicationFormPDF';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const CLASSES = {
  'Nursery': ['Nursery 1', 'Nursery 2', 'Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 
  'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function AdmissionForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Email verification
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeInput, setEmailCodeInput] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // Pre-fill section/class from requirements page
  const urlParams = new URLSearchParams(window.location.search);
  const prefillSection = urlParams.get('section') || '';
  const prefillClass = urlParams.get('class') || '';

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    passport_photo: '',
    section_applying: prefillSection,
    class_applying: prefillClass,
    former_school_name: '',
    former_school_class: '',
    last_result_upload: '',
    state_of_origin: '',
    local_government: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    parent_occupation: '',
    emergency_contact: '',
    health_conditions: ''
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (field === 'section_applying') {
      setFormData({ ...formData, section_applying: value, class_applying: '' });
    }
    if (field === 'parent_email') {
      setEmailVerified(false);
      setEmailCode('');
      setEmailCodeInput('');
    }
  };

  const sendVerificationCode = async () => {
    if (!formData.parent_email) { alert('Please enter your email address first.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.parent_email)) { alert('Please enter a valid email address.'); return; }
    setCodeSending(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setEmailCode(code);
    try {
      await base44.integrations.Core.SendEmail({
        to: formData.parent_email,
        subject: 'Email Verification Code — Milton College Admission',
        body: `Your email verification code is: ${code}\n\nEnter this code on the admission form to verify your email and proceed with your application.\n\nMilton College of Arts and Science, Kaduna`,
        from_name: 'Milton College Admissions'
      });
      alert('Verification code sent to your email. Please check your inbox (and spam folder).');
    } catch (e) {
      console.error('Email verification error:', e);
      alert('Failed to send verification code: ' + (e?.message || 'Unknown error') + '. Please try again or contact the school.');
    }
    setCodeSending(false);
  };

  const verifyEmailCode = () => {
    if (emailCodeInput === emailCode && emailCode) {
      setEmailVerified(true);
    } else {
      alert('Invalid verification code. Please try again.');
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size for passport (5MB max)
    if (field === 'passport_photo' && file.size > 5 * 1024 * 1024) {
      alert('Passport photo must be less than 5MB');
      return;
    }

    // Check file type
    if (field === 'passport_photo' && !['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Passport photo must be in JPEG or PNG format');
      return;
    }

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    handleChange(field, file_url);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      alert('Unable to access camera. Please use file upload instead.');
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'passport.jpg', { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        handleChange('passport_photo', file_url);
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const appNum = 'APP' + Date.now().toString().slice(-8);
    const appDate = new Date().toISOString().split('T')[0];
    
    const created = await base44.entities.AdmissionApplication.create({
      ...formData,
      application_number: appNum,
      application_date: appDate,
      status: 'Pending',
      email_verified: true
    });

    // Generate application form PDF and upload
    let pdfUrl = null;
    try {
      const doc = generateApplicationFormPDF({ ...formData, application_number: appNum, application_date: appDate });
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `application-form-${appNum}.pdf`, { type: 'application/pdf' });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      pdfUrl = uploadRes.file_url;
      await base44.entities.AdmissionApplication.update(created.id, {
        application_form_pdf_url: pdfUrl
      });
    } catch (e) {
      console.error('Application PDF error:', e);
    }

    // Send confirmation email to parent/guardian with PDF link
    if (formData.parent_email) {
      const applicantName = `${formData.first_name} ${formData.middle_name ? formData.middle_name + ' ' : ''}${formData.last_name}`.trim();
      await base44.integrations.Core.SendEmail({
        to: formData.parent_email,
        subject: `Admission Application Received — ${applicantName} | Ref: ${appNum}`,
        body: `Dear ${formData.parent_name},\n\nThank you for applying to Milton College of Arts and Science, Kaduna.\n\nYour application has been received and is currently under review.\n\nAPPLICATION DETAILS:\nApplicant Name: ${applicantName}\nApplication Number: ${appNum}\nDate Submitted: ${appDate}\nSection Applied For: ${formData.section_applying}\nClass Applied For: ${formData.class_applying}\nFormer School: ${formData.former_school_name || 'N/A'}\n\nYour completed application form (PDF) is available at:\n${pdfUrl || 'Contact the school for a copy.'}\n\nPlease keep your Application Number (${appNum}) safe. You will need it to check your application status.\n\nTo check your application status at any time, visit our website and enter your application number.\n\nWe will notify you once your application has been reviewed by our admissions office.\n\nWarm regards,\nAdmissions Office\nMilton College of Arts and Science, Kaduna`,
        from_name: 'Milton College Admissions'
      }).catch(() => {});
    }

    setApplicationNumber(appNum);
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2c4a6e] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your application has been received successfully.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500">Application Number</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">{applicationNumber}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Please save this number for tracking your application status.
          </p>
          <Link to={createPageUrl('Home')}>
            <Button className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2c4a6e] text-white py-8">
        <div className="container mx-auto px-4">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Admission Application</h1>
              <p className="text-blue-200">Milton College of Arts and Science, Kaduna</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[
            { num: 1, label: 'Personal Info', icon: User },
            { num: 2, label: 'Education', icon: GraduationCap },
            { num: 3, label: 'Location', icon: MapPin },
            { num: 4, label: 'Parent/Guardian', icon: Users }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= s.num ? 'bg-[#1e3a5f] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-1 ${step >= s.num ? 'text-[#1e3a5f]' : 'text-gray-500'}`}>{s.label}</span>
              </div>
              {idx < 3 && <div className={`w-16 h-1 mx-2 ${step > s.num ? 'bg-[#1e3a5f]' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>First Name *</Label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) => handleChange('first_name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Middle Name</Label>
                      <Input
                        value={formData.middle_name}
                        onChange={(e) => handleChange('middle_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Date of Birth *</Label>
                      <Input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleChange('date_of_birth', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Gender *</Label>
                      <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Email + Verification */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <Label className="text-blue-900">Email Address * (must be verified to proceed)</Label>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={formData.parent_email}
                        onChange={(e) => handleChange('parent_email', e.target.value)}
                        placeholder="Enter parent/guardian email"
                        required
                        disabled={emailVerified}
                        className="flex-1"
                      />
                      {emailVerified ? (
                        <div className="flex items-center gap-1 px-3 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                          <BadgeCheck className="w-4 h-4" /> Verified
                        </div>
                      ) : (
                        <Button type="button" variant="outline" onClick={sendVerificationCode} disabled={codeSending || !formData.parent_email}>
                          {codeSending ? 'Sending...' : 'Send Code'}
                        </Button>
                      )}
                    </div>
                    {!emailVerified && emailCode && (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={emailCodeInput}
                          onChange={(e) => setEmailCodeInput(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="flex-1"
                          maxLength={6}
                        />
                        <Button type="button" onClick={verifyEmailCode} className="bg-green-600 hover:bg-green-700">
                          <ShieldCheck className="w-4 h-4 mr-1" /> Verify
                        </Button>
                      </div>
                    )}
                    {emailVerified && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Email verified. You can now proceed to the next step.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Passport Photo *</Label>
                    <div className="mt-2">
                      {formData.passport_photo ? (
                        <div className="flex items-center gap-4">
                          <img src={formData.passport_photo} alt="Passport" className="w-24 h-24 object-cover rounded-lg" />
                          <Button type="button" variant="outline" onClick={() => handleChange('passport_photo', '')}>
                            Remove
                          </Button>
                        </div>
                      ) : showCamera ? (
                        <div className="space-y-4">
                          <div className="relative">
                            <video ref={videoRef} autoPlay className="w-full max-w-md rounded-lg" />
                            <canvas ref={canvasRef} className="hidden" />
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" onClick={capturePhoto} className="bg-[#1e3a5f]">
                              <Camera className="w-4 h-4 mr-2" />
                              Capture Photo
                            </Button>
                            <Button type="button" variant="outline" onClick={stopCamera}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#1e3a5f] transition-colors"
                          >
                            <Camera className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">Take Photo</span>
                          </button>
                          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1e3a5f] transition-colors">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">Upload Photo</span>
                            <input type="file" className="hidden" accept="image/jpeg,image/jpg,image/png" onChange={(e) => handleFileUpload(e, 'passport_photo')} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setStep(2)} disabled={!emailVerified} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                      {emailVerified ? 'Next' : 'Verify email to continue'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Education */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Educational Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Section Applying For *</Label>
                      <Select value={formData.section_applying} onValueChange={(v) => handleChange('section_applying', v)}>
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
                      <Select 
                        value={formData.class_applying} 
                        onValueChange={(v) => handleChange('class_applying', v)}
                        disabled={!formData.section_applying}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.section_applying && CLASSES[formData.section_applying]?.map(cls => (
                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Former School Name *</Label>
                      <Input
                        value={formData.former_school_name}
                        onChange={(e) => handleChange('former_school_name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Class in Former School</Label>
                      <Input
                        value={formData.former_school_class}
                        onChange={(e) => handleChange('former_school_class', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Last Term Result (Optional)</Label>
                    <div className="mt-2">
                      {formData.last_result_upload ? (
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-green-600">File uploaded</span>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleChange('last_result_upload', '')}>
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1e3a5f]">
                          <Upload className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-sm text-gray-500">Upload last term result</span>
                          <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'last_result_upload')} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Previous
                    </Button>
                    <Button type="button" onClick={() => setStep(3)} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Location Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>State of Origin *</Label>
                      <Select value={formData.state_of_origin} onValueChange={(v) => handleChange('state_of_origin', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Local Government Area</Label>
                      <Input
                        value={formData.local_government}
                        onChange={(e) => handleChange('local_government', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Home Address *</Label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>
                      Previous
                    </Button>
                    <Button type="button" onClick={() => setStep(4)} className="bg-[#1e3a5f] hover:bg-[#2c4a6e]">
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Parent/Guardian */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Parent/Guardian Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Parent/Guardian Name *</Label>
                      <Input
                        value={formData.parent_name}
                        onChange={(e) => handleChange('parent_name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone Number *</Label>
                      <Input
                        value={formData.parent_phone}
                        onChange={(e) => handleChange('parent_phone', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Email Address (Verified)</Label>
                      <div className="flex items-center gap-2">
                        <Input type="email" value={formData.parent_email} disabled className="flex-1 bg-green-50" />
                        <BadgeCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      </div>
                    </div>
                    <div>
                      <Label>Occupation</Label>
                      <Input
                        value={formData.parent_occupation}
                        onChange={(e) => handleChange('parent_occupation', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Emergency Contact Number</Label>
                    <Input
                      value={formData.emergency_contact}
                      onChange={(e) => handleChange('emergency_contact', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Health Conditions (if any)</Label>
                    <Textarea
                      value={formData.health_conditions}
                      onChange={(e) => handleChange('health_conditions', e.target.value)}
                      placeholder="Please list any health conditions, allergies, or special needs"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(3)}>
                      Previous
                    </Button>
                    <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}