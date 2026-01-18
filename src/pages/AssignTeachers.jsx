import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, BookOpen, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function AssignTeachers() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('Secondary');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [subjectsData, teachersData] = await Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Teacher.filter({ status: 'Active' })
    ]);
    setSubjects(subjectsData);
    setTeachers(teachersData);
    setLoading(false);
  };

  const handleAssignTeacher = async (subject, teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    await base44.entities.Subject.update(subject.id, {
      teacher_id: teacherId,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : ''
    });
    loadData();
  };

  const handleAssignFormTeacher = async (teacherId, className) => {
    await base44.entities.Teacher.update(teacherId, {
      form_teacher_class: className,
      teacher_type: 'Form Teacher'
    });
    loadData();
  };

  const sectionSubjects = subjects.filter(s => s.section === section);
  const sectionTeachers = teachers.filter(t => t.section === section);
  const classes = section === 'Secondary' 
    ? ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
    : section === 'Primary'
    ? ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B']
    : ['Reception Class'];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Assign Teachers</h1>
          <p className="text-gray-500">Assign teachers to subjects and form teachers to classes</p>
        </div>

        {/* Section Selector */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="max-w-xs">
              <Label>Select Section</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nursery">Nursery</SelectItem>
                  <SelectItem value="Primary">Primary</SelectItem>
                  <SelectItem value="Secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Assign Subject Teachers */}
          <div>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Assign Subject Teachers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  sectionSubjects.map(subject => (
                    <div key={subject.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{subject.name}</p>
                        {subject.teacher_name && (
                          <Badge variant="outline" className="text-xs">
                            {subject.teacher_name}
                          </Badge>
                        )}
                      </div>
                      <Select 
                        value={subject.teacher_id || ''} 
                        onValueChange={(v) => handleAssignTeacher(subject, v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                        <SelectContent>
                          {sectionTeachers.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.first_name} {t.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
                {!loading && sectionSubjects.length === 0 && (
                  <p className="text-center py-8 text-gray-500">No subjects found</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Assign Form Teachers */}
          <div>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Assign Form Teachers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  classes.map(className => {
                    const formTeacher = teachers.find(t => t.form_teacher_class === className);
                    return (
                      <div key={className} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{className}</p>
                          {formTeacher && (
                            <Badge variant="outline" className="text-xs">
                              {formTeacher.first_name} {formTeacher.last_name}
                            </Badge>
                          )}
                        </div>
                        <Select 
                          value={formTeacher?.id || ''} 
                          onValueChange={(v) => handleAssignFormTeacher(v, className)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select form teacher" /></SelectTrigger>
                          <SelectContent>
                            {sectionTeachers.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.first_name} {t.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}