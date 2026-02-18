import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User, Mail, Phone, BookOpen, GraduationCap, Calendar, Shield, Edit, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StaffProfile() {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [staffRoles, setStaffRoles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [teacherData, rolesData, settingsData] = await Promise.all([
        base44.entities.Teacher.filter({ email: userData.email }),
        base44.entities.StaffRole.filter({ user_email: userData.email }),
        base44.entities.SchoolSettings.list()
      ]);

      const t = teacherData[0] || null;
      setTeacher(t);
      setStaffRoles(rolesData);
      setSettings(settingsData[0] || {});

      if (t) {
        setEditData({ phone: t.phone || '', qualification: t.qualification || '', passport_photo: t.passport_photo || '' });
        const subjectsData = await base44.entities.Subject.filter({ teacher_id: t.id });
        setSubjects(subjectsData);
      }
    } catch (e) {
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (teacher) {
      await base44.entities.Teacher.update(teacher.id, editData);
      loadData();
    }
    setEditOpen(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditData({ ...editData, passport_photo: file_url });
    }
  };

  const getRoleColor = (role) => {
    const colors = { 'Admin': 'bg-red-100 text-red-800', 'Principal': 'bg-blue-100 text-blue-800', 'Head Teacher': 'bg-green-100 text-green-800', 'Teacher': 'bg-purple-100 text-purple-800', 'Form Teacher': 'bg-indigo-100 text-indigo-800' };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div></div>;
  }

  // Multiple roles: show a two-in-one profile
  const hasMultipleRoles = staffRoles.length > 1;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <Card className="border-0 shadow-lg mb-6 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e]" />
          <CardContent className="p-6 -mt-12">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="relative">
                {teacher?.passport_photo ? (
                  <img src={teacher.passport_photo} alt={teacher.first_name} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 pb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {teacher ? `${teacher.first_name} ${teacher.last_name}` : user?.full_name}
                </h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {staffRoles.map((role, i) => (
                    <Badge key={i} className={getRoleColor(role.role)}>{role.role} – {role.section}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />Edit Profile
                </Button>
                <Button variant="ghost" size="sm" onClick={() => base44.auth.logout()}>
                  <LogOut className="w-4 h-4 mr-2" />Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two-in-one tab for multi-role staff */}
        {hasMultipleRoles ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="profile">Personal Profile</TabsTrigger>
              {staffRoles.map((role, i) => (
                <TabsTrigger key={i} value={`role_${i}`}>{role.role} Role</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="profile">
              <PersonalInfo teacher={teacher} user={user} subjects={subjects} />
            </TabsContent>

            {staffRoles.map((role, i) => (
              <TabsContent key={i} value={`role_${i}`}>
                <RoleInfo role={role} teacher={teacher} subjects={subjects} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <PersonalInfo teacher={teacher} user={user} subjects={subjects} />
            {staffRoles[0] && <RoleInfo role={staffRoles[0]} teacher={teacher} subjects={subjects} />}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Phone</Label>
              <Input value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
            </div>
            <div>
              <Label>Qualification</Label>
              <Input value={editData.qualification || ''} onChange={e => setEditData({ ...editData, qualification: e.target.value })} />
            </div>
            <div>
              <Label>Passport Photo</Label>
              {editData.passport_photo ? (
                <div className="flex items-center gap-3 mt-2">
                  <img src={editData.passport_photo} className="w-16 h-16 rounded-full object-cover" alt="" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditData({ ...editData, passport_photo: '' })}>Remove</Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center w-full hover:border-[#1e3a5f]">
                    <p className="text-sm text-gray-500">Click to upload photo</p>
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#2c4a6e]" onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PersonalInfo({ teacher, user, subjects }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Personal Information</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <InfoRow label="Staff ID" value={teacher?.staff_id || '—'} mono />
        <InfoRow label="Full Name" value={teacher ? `${teacher.first_name} ${teacher.last_name}` : user?.full_name} />
        <InfoRow label="Email" value={teacher?.email || user?.email} icon={<Mail className="w-4 h-4 text-gray-400" />} />
        <InfoRow label="Phone" value={teacher?.phone || '—'} icon={<Phone className="w-4 h-4 text-gray-400" />} />
        <InfoRow label="Section" value={teacher?.section || '—'} />
        <InfoRow label="Teacher Type" value={teacher?.teacher_type || '—'} />
        <InfoRow label="Qualification" value={teacher?.qualification || '—'} icon={<GraduationCap className="w-4 h-4 text-gray-400" />} />
        <InfoRow label="Date Employed" value={teacher?.date_employed || '—'} icon={<Calendar className="w-4 h-4 text-gray-400" />} />
        <InfoRow label="Status" value={teacher?.status || 'Active'} badge />
        {teacher?.assigned_class && <InfoRow label="Assigned Class" value={teacher.assigned_class} />}
        {subjects.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" />Subjects ({subjects.length})</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => <Badge key={s.id} variant="outline">{s.name}</Badge>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoleInfo({ role, teacher, subjects }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />{role.role} Role Details</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <InfoRow label="Role" value={role.role} badge />
        <InfoRow label="Section" value={role.section} />
        <InfoRow label="Status" value={role.status} badge />
        {role.role === 'Class Teacher' && teacher?.assigned_class && (
          <InfoRow label="Class" value={teacher.assigned_class} />
        )}
        {role.role === 'Form Teacher' && teacher?.form_teacher_class && (
          <InfoRow label="Form Class" value={teacher.form_teacher_class} />
        )}
        {(role.role === 'Teacher' || role.role === 'Form Teacher') && subjects.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Assigned Subjects</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => <Badge key={s.id} variant="outline">{s.name}</Badge>)}
            </div>
          </div>
        )}
        {(role.role === 'Principal' || role.role === 'Head Teacher') && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium">Administrative Access</p>
            <p className="text-xs text-blue-600 mt-1">Can review and approve student results, add comments, and manage school operations for {role.section} section.</p>
          </div>
        )}
        {role.role === 'Admin' && (
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">Full System Access</p>
            <p className="text-xs text-red-600 mt-1">Has access to all modules including settings, staff, students, results, and reports.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, mono, icon, badge }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 flex items-center gap-1">{icon}{label}</span>
      {badge ? (
        <Badge className="bg-green-100 text-green-800">{value}</Badge>
      ) : (
        <span className={`text-sm font-medium ${mono ? 'font-mono text-[#1e3a5f]' : ''}`}>{value}</span>
      )}
    </div>
  );
}