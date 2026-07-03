import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Phone, ShieldCheck, CheckCircle, ArrowLeft } from 'lucide-react';

/**
 * Reusable Forgot Password dialog.
 * Props:
 * - open: boolean
 * - onOpenChange: (open) => void
 * - entityType: string (e.g. 'Teacher', 'NonAcademicStaff', 'Student', 'Parent')
 * - identifierField: string (e.g. 'staff_id', 'admission_number', 'parent_id')
 * - identifierLabel: string (e.g. 'Staff ID', 'Admission Number', 'Parent ID')
 * - phoneField: string (e.g. 'phone', 'parent_phone') — null/undefined for students who use admission number
 * - extraFilter: object (e.g. { role: 'Accountant' })
 * - themeColor: string (tailwind bg class, e.g. 'bg-blue-600')
 */
export default function ForgotPasswordDialog({
  open,
  onOpenChange,
  entityType,
  identifierField,
  identifierLabel,
  phoneField = 'phone',
  extraFilter = {},
  themeColor = 'bg-blue-600',
}) {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recordId, setRecordId] = useState(null);

  const reset = () => {
    setStep(1);
    setIdentifier('');
    setPhone('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    setRecordId(null);
  };

  const handleClose = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleVerify = async () => {
    setError('');
    if (!identifier.trim()) { setError(`Please enter your ${identifierLabel}.`); return; }

    // For students, no phone verification needed — admission number is the verifier
    if (phoneField) {
      if (!phone.trim()) { setError('Please enter your phone number.'); return; }
    }

    setLoading(true);
    try {
      const filter = { [identifierField]: identifier.trim(), ...extraFilter };
      const results = await base44.entities[entityType].filter(filter);
      if (!results[0]) {
        setError(`No record found with that ${identifierLabel}. Please check and try again.`);
        setLoading(false);
        return;
      }
      const record = results[0];

      if (phoneField) {
        // Normalize phone comparison (strip spaces, +, etc.)
        const normalize = (p) => (p || '').replace(/[\s+\-()]/g, '');
        if (normalize(record[phoneField]) !== normalize(phone)) {
          setError(`The phone number does not match the record for this ${identifierLabel}. Please contact the school admin.`);
          setLoading(false);
          return;
        }
      }

      setRecordId(record.id);
      setStep(2);
    } catch (e) {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handleReset = async () => {
    setError('');
    if (!newPassword) { setError('Please enter a new password.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await base44.entities[entityType].update(recordId, { custom_password: newPassword });
      setSuccess(true);
      setTimeout(() => { handleClose(false); }, 2500);
    } catch (e) {
      setError('Failed to save new password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Forgot Password
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <p className="font-semibold text-gray-900">Password Changed Successfully!</p>
            <p className="text-sm text-gray-500">You can now log in with your new password.</p>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {phoneField
                ? `Enter your ${identifierLabel} and the phone number linked to your account to verify your identity.`
                : `Enter your ${identifierLabel} to verify your identity.`}
            </p>
            <div>
              <Label>{identifierLabel}</Label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={`Enter your ${identifierLabel}`}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            </div>
            {phoneField && (
              <div>
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08033492870"
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  />
                </div>
              </div>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className={`w-full ${themeColor}`} onClick={handleVerify} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Identity'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
              <ShieldCheck className="w-4 h-4" /> Identity verified. Set your new password.
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button className={`flex-1 ${themeColor}`} onClick={handleReset} disabled={loading}>
                {loading ? 'Saving...' : 'Save New Password'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}