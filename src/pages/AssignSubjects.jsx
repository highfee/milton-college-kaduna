import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const CLASSES = {
  'Nursery': ['Reception Class'],
  'Primary': ['Primary 1A', 'Primary 1B', 'Primary 2A', 'Primary 2B', 'Primary 3A', 'Primary 3B', 'Primary 4A', 'Primary 4B', 'Primary 5A', 'Primary 5B'],
  'Secondary': ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'JSS 3B', 'SS1 Arts A', 'SS1 Arts B', 'SS1 Com A', 'SS1 Com B', 'SS1 Sci A', 'SS1 Sci B', 'SS2 Arts A', 'SS2 Arts B', 'SS2 Com A', 'SS2 Com B', 'SS2 Sci A', 'SS2 Sci B', 'SS3 Arts A', 'SS3 Arts B', 'SS3 Com A', 'SS3 Com B', 'SS3 Sci A', 'SS3 Sci B']
};

export default function AssignSubjects() {
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState('Secondary');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    
    const subjectsData = await base44.entities.Subject.list();
    setSubjects(subjectsData);
    setLoading(false);
  };

  const handleClassToggle = async (subject, className) => {
    const currentClasses = subject.classes || [];
    const newClasses = currentClasses.includes(className)
      ? currentClasses.filter(c => c !== className)
      : [...currentClasses, className];
    
    await base44.entities.Subject.update(subject.id, { classes: newClasses });
    loadData();
  };

  const sectionSubjects = subjects.filter(s => s.section === section);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Assign Subjects to Classes</h1>
          <p className="text-gray-500">Configure which subjects are taught in each class</p>
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

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {sectionSubjects.map((subject) => (
              <Card key={subject.id} className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-[#1e3a5f]" />
                    </div>
                    <div>
                      <p>{subject.name}</p>
                      <p className="text-sm font-normal text-gray-500">
                        {subject.classes?.length || 0} classes assigned
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {(CLASSES[section] || []).map(className => (
                      <div key={className} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                        <Checkbox
                          id={`${subject.id}-${className}`}
                          checked={subject.classes?.includes(className)}
                          onCheckedChange={() => handleClassToggle(subject, className)}
                        />
                        <label htmlFor={`${subject.id}-${className}`} className="text-sm cursor-pointer flex-1">
                          {className}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {sectionSubjects.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-gray-500">
                  <p>No subjects found for {section} section</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}