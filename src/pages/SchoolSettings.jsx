import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Upload, School, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function SchoolSettings() {
  const [settings, setSettings] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    school_name: 'Milton College of Arts and Science',
    school_logo: '',
    phone: '09067879088',
    email: '',
    address: 'Kaduna, Nigeria',
    current_session: '',
    current_term: 'First Term',
    principal_id: '',
    principal_name: '',
    head_teacher_id: '',
    head_teacher_name: '',
    motto: '',
    about: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [settingsData, teachersData] = await Promise.all([
      base44.entities.SchoolSettings.list(),
      base44.entities.Teacher.filter({ status: 'Active' })
    ]);
    
    if (settingsData[0]) {
      setSettings(settingsData[0]);
      setFormData(settingsData[0]);
    }
    setTeachers(teachersData);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Get principal and head teacher names
    const principal = teachers.find(t => t.id === formData.principal_id);
    const headTeacher = teachers.find(t => t.id === formData.head_teacher_id);

    const dataToSave = {
      ...formData,
      principal_name: principal ? `${principal.first_name} ${principal.last_name}` : formData.principal_name,
      head_teacher_name: headTeacher ? `${headTeacher.first_name} ${headTeacher.last_name}` : formData.head_teacher_name
    };

    if (settings) {
      await base44.entities.SchoolSettings.update(settings.id, dataToSave);
    } else {
      await base44.entities.SchoolSettings.create(dataToSave);
    }

    // Update staff roles
    if (formData.principal_id && principal) {
      const existingRole = await base44.entities.StaffRole.filter({ user_email: principal.email, role: 'Principal' });
      if (existingRole.length === 0) {
        await base44.entities.StaffRole.create({
          user_email: principal.email,
          user_name: `${principal.first_name} ${principal.last_name}`,
          role: 'Principal',
          section: 'Secondary',
          teacher_id: formData.principal_id,
          status: 'Active'
        });
      }
    }

    if (formData.head_teacher_id && headTeacher) {
      const existingRole = await base44.entities.StaffRole.filter({ user_email: headTeacher.email, role: 'Head Teacher' });
      if (existingRole.length === 0) {
        await base44.entities.StaffRole.create({
          user_email: headTeacher.email,
          user_name: `${headTeacher.first_name} ${headTeacher.last_name}`,
          role: 'Head Teacher',
          section: 'Primary',
          teacher_id: formData.head_teacher_id,
          status: 'Active'
        });
      }
    }

    setSaving(false);
    alert('Settings saved successfully!');
    loadData();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, school_logo: file_url });
    }
  };

  const secondaryTeachers = teachers.filter(t => t.section === 'Secondary');
  const primaryTeachers = teachers.filter(t => t.section === 'Primary' || t.section === 'Nursery');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">School Settings</h1>
          <p className="text-gray-500">Configure school information and settings</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* School Logo & Name */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="w-5 h-5" />
                School Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <Label>School Logo</Label>
                  <div className="mt-2">
                    {formData.school_logo ? (
                      <div className="space-y-2">
                        <img src={formData.school_logo} alt="Logo" className="w-32 h-32 object-contain bg-gray-100 rounded-xl p-2" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, school_logo: '' })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#1e3a5f]">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500">Upload Logo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label>School Name *</Label>
                    <Input
                      value={formData.school_name}
                      onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Motto</Label>
                    <Input
                      value={formData.motto}
                      onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                      placeholder="School motto"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>About School</Label>
                <Textarea
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  rows={4}
                  placeholder="Brief description about the school"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Academic Session */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Academic Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Current Session *</Label>
                  <Input
                    value={formData.current_session}
                    onChange={(e) => setFormData({ ...formData, current_session: e.target.value })}
                    placeholder="e.g., 2024/2025"
                    required
                  />
                </div>
                <div>
                  <Label>Current Term *</Label>
                  <Select value={formData.current_term} onValueChange={(v) => setFormData({ ...formData, current_term: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leadership Assignment */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Leadership Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Principal (Secondary Section)</Label>
                  <Select value={formData.principal_id} onValueChange={(v) => setFormData({ ...formData, principal_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Principal" /></SelectTrigger>
                    <SelectContent>
                      {secondaryTeachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Head Teacher (Primary & Nursery)</Label>
                  <Select value={formData.head_teacher_id} onValueChange={(v) => setFormData({ ...formData, head_teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Head Teacher" /></SelectTrigger>
                    <SelectContent>
                      {primaryTeachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2c4a6e]" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}