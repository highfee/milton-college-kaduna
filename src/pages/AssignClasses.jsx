import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, School } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function AssignClasses() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('Primary');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const teachersData = await base44.entities.Teacher.filter({ status: 'Active' });
    setTeachers(teachersData);
    setLoading(false);
  };

  const handleAssignClass = async (teacherId, className) => {
    await base44.entities.Teacher.update(teacherId, {
      assigned_class: className,
      teacher_type: 'Class Teacher'
    });
    loadData();
  };

  const sectionTeachers = teachers.filter(t => t.section === section);
  const classes = section === 'Primary'
    ? ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B']
    : ['Nursery 1', 'Nursery 2', 'Reception Class'];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Assign Classes to Teachers</h1>
          <p className="text-gray-500">Assign class teachers for Primary and Nursery sections</p>
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="w-5 h-5" />
              Class Teachers Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
              </div>
            ) : (
              classes.map(className => {
                const classTeacher = teachers.find(t => t.assigned_class === className);
                return (
                  <div key={className} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-lg">{className}</p>
                      {classTeacher && (
                        <Badge variant="outline">
                          {classTeacher.first_name} {classTeacher.last_name}
                        </Badge>
                      )}
                    </div>
                    <Select 
                      value={classTeacher?.id || ''} 
                      onValueChange={(v) => handleAssignClass(v, className)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select class teacher" /></SelectTrigger>
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
  );
}