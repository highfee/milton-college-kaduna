import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { User, BookOpen, Calendar, Award, AlertTriangle, Edit, ArrowLeft } from 'lucide-react';
import { nigerianStates, getLGAsByState, nigerianTribes } from '@/components/NigerianData';
import { calculateAverage, formatPosition } from '@/components/GradingUtils';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StudentProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [selectedState, setSelectedState] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl('PortalLogin'));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: student, isLoading: studentLoading, refetch: refetchStudent } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const students = await base44.entities.Student.filter({ id: studentId });
      return students[0];
    },
    enabled: !!studentId,
  });

  const { data: results } = useQuery({
    queryKey: ['studentResults', studentId],
    queryFn: () => base44.entities.Result.filter({ student_id: studentId }),
    enabled: !!studentId,
    initialData: [],
  });

  const { data: attendance } = useQuery({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => base44.entities.Attendance.filter({ student_id: studentId }),
    enabled: !!studentId,
    initialData: [],
  });

  const { data: discipline } = useQuery({
    queryKey: ['studentDiscipline', studentId],
    queryFn: () => base44.entities.Discipline.filter({ student_id: studentId }),
    enabled: !!studentId,
    initialData: [],
  });

  const { data: awards } = useQuery({
    queryKey: ['studentAwards', studentId],
    queryFn: () => base44.entities.Award.filter({ student_id: studentId }),
    enabled: !!studentId,
    initialData: [],
  });

  const { data: reportCards } = useQuery({
    queryKey: ['studentReportCards', studentId],
    queryFn: () => base44.entities.ReportCard.filter({ student_id: studentId }),
    enabled: !!studentId,
    initialData: [],
  });

  const handleEditStudent = async () => {
    try {
      await base44.entities.Student.update(studentId, editData);
      setEditDialogOpen(false);
      refetchStudent();
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const openEditDialog = () => {
    setEditData({
      first_name: student.first_name,
      last_name: student.last_name,
      middle_name: student.middle_name,
      date_of_birth: student.date_of_birth,
      gender: student.gender,
      current_class: student.current_class,
      state_of_origin: student.state_of_origin,
      local_government: student.local_government,
      tribe: student.tribe,
      blood_group: student.blood_group,
      genotype: student.genotype,
      sport_house: student.sport_house,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      parent_email: student.parent_email,
      address: student.address,
    });
    setSelectedState(student.state_of_origin || '');
    setEditDialogOpen(true);
  };

  const groupResultsByTerm = () => {
    const grouped = {};
    results.forEach(result => {
      const key = `${result.session}-${result.term}`;
      if (!grouped[key]) {
        grouped[key] = {
          session: result.session,
          term: result.term,
          results: []
        };
      }
      grouped[key].results.push(result);
    });
    return Object.values(grouped).sort((a, b) => b.session.localeCompare(a.session));
  };

  const getAttendanceStats = () => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const late = attendance.filter(a => a.status === 'Late').length;
    return { total, present, absent, late, percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0 };
  };

  if (studentLoading || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading student profile...</p>
        </div>
      </div>
    );
  }

  const termResults = groupResultsByTerm();
  const attendanceStats = getAttendanceStats();
  const canEdit = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Student Profile</h1>
          </div>
          {canEdit && (
            <Button onClick={openEditDialog}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {student.passport_photo ? (
                <img src={student.passport_photo} alt={student.first_name} className="w-32 h-32 rounded-lg object-cover" />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="h-16 w-16 text-blue-600" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {student.first_name} {student.middle_name} {student.last_name}
                </h2>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Admission Number</p>
                    <p className="font-medium">{student.admission_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Class</p>
                    <p className="font-medium">{student.current_class}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Section</p>
                    <p className="font-medium">{student.section}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant={student.status === 'Active' ? 'default' : 'secondary'}>
                      {student.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="academic">Academic History</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="discipline">Discipline</TabsTrigger>
            <TabsTrigger value="awards">Awards</TabsTrigger>
          </TabsList>

          {/* Personal Information */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Basic Information</h3>
                    <div className="space-y-2">
                      <div><span className="text-gray-500">Date of Birth:</span> <span className="font-medium">{student.date_of_birth}</span></div>
                      <div><span className="text-gray-500">Gender:</span> <span className="font-medium">{student.gender}</span></div>
                      <div><span className="text-gray-500">Blood Group:</span> <span className="font-medium">{student.blood_group}</span></div>
                      <div><span className="text-gray-500">Genotype:</span> <span className="font-medium">{student.genotype}</span></div>
                      <div><span className="text-gray-500">Sport House:</span> <span className="font-medium">{student.sport_house}</span></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Origin</h3>
                    <div className="space-y-2">
                      <div><span className="text-gray-500">State:</span> <span className="font-medium">{student.state_of_origin}</span></div>
                      <div><span className="text-gray-500">LGA:</span> <span className="font-medium">{student.local_government}</span></div>
                      <div><span className="text-gray-500">Tribe:</span> <span className="font-medium">{student.tribe}</span></div>
                      <div><span className="text-gray-500">Address:</span> <span className="font-medium">{student.address}</span></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Parent/Guardian Information</h3>
                    <div className="space-y-2">
                      <div><span className="text-gray-500">Name:</span> <span className="font-medium">{student.parent_name}</span></div>
                      <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{student.parent_phone}</span></div>
                      <div><span className="text-gray-500">Email:</span> <span className="font-medium">{student.parent_email}</span></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Admission Details</h3>
                    <div className="space-y-2">
                      <div><span className="text-gray-500">Admission Date:</span> <span className="font-medium">{student.admission_date}</span></div>
                      <div><span className="text-gray-500">Current Session:</span> <span className="font-medium">{student.current_session}</span></div>
                      <div><span className="text-gray-500">Current Term:</span> <span className="font-medium">{student.current_term}</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academic History */}
          <TabsContent value="academic">
            <div className="space-y-6">
              {termResults.map((term, idx) => {
                const avg = calculateAverage(term.results);
                const reportCard = reportCards.find(rc => rc.session === term.session && rc.term === term.term);
                
                return (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{term.session} - {term.term}</CardTitle>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Average</p>
                            <p className="text-2xl font-bold text-blue-600">{avg.average.toFixed(1)}%</p>
                            <Badge>{avg.grade}</Badge>
                          </div>
                          {reportCard && (
                            <Badge variant="outline">Position: {formatPosition(reportCard.position)} / {reportCard.total_students}</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-2 text-left">Subject</th>
                              <th className="p-2 text-center">1st CA</th>
                              <th className="p-2 text-center">2nd CA</th>
                              <th className="p-2 text-center">Exam</th>
                              <th className="p-2 text-center">Total</th>
                              <th className="p-2 text-center">Grade</th>
                              <th className="p-2 text-center">Remark</th>
                            </tr>
                          </thead>
                          <tbody>
                            {term.results.map(result => (
                              <tr key={result.id} className="border-t">
                                <td className="p-2 font-medium">{result.subject_name}</td>
                                <td className="p-2 text-center">{result.first_ca}</td>
                                <td className="p-2 text-center">{result.second_ca}</td>
                                <td className="p-2 text-center">{result.exam_score}</td>
                                <td className="p-2 text-center font-bold">{result.total}</td>
                                <td className="p-2 text-center">
                                  <Badge variant="outline">{result.grade}</Badge>
                                </td>
                                <td className="p-2 text-center text-xs">{result.remark}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {termResults.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    No academic records found
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Days</p>
                    <p className="text-2xl font-bold text-blue-600">{attendanceStats.total}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">Late</p>
                    <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Percentage</p>
                    <p className="text-2xl font-bold text-purple-600">{attendanceStats.percentage}%</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Session/Term</th>
                        <th className="p-2 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.slice(0, 50).map(record => (
                        <tr key={record.id} className="border-t">
                          <td className="p-2">{record.date}</td>
                          <td className="p-2">
                            <Badge variant={
                              record.status === 'Present' ? 'default' : 
                              record.status === 'Absent' ? 'destructive' : 'secondary'
                            }>
                              {record.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-xs">{record.session} - {record.term}</td>
                          <td className="p-2 text-xs">{record.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discipline */}
          <TabsContent value="discipline">
            <Card>
              <CardHeader>
                <CardTitle>Disciplinary Records</CardTitle>
              </CardHeader>
              <CardContent>
                {discipline.length > 0 ? (
                  <div className="space-y-4">
                    {discipline.map(record => (
                      <div key={record.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`h-5 w-5 ${
                              record.incident_type === 'Serious' ? 'text-red-600' :
                              record.incident_type === 'Major' ? 'text-orange-600' : 'text-yellow-600'
                            }`} />
                            <h3 className="font-semibold">{record.incident_type} Incident</h3>
                          </div>
                          <Badge variant={record.status === 'Resolved' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{record.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                          <div>Date: {record.incident_date}</div>
                          <div>Term: {record.session} - {record.term}</div>
                          <div>Action Taken: {record.action_taken}</div>
                          <div>Reported By: {record.reported_by}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No disciplinary records</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Awards */}
          <TabsContent value="awards">
            <Card>
              <CardHeader>
                <CardTitle>Awards & Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                {awards.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {awards.map(award => (
                      <div key={award.id} className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50">
                        <div className="flex items-start gap-3">
                          <Award className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{award.award_name}</h3>
                            <Badge variant="outline" className="mt-1">{award.award_type}</Badge>
                            <p className="text-sm text-gray-600 mt-2">{award.description}</p>
                            <div className="mt-3 text-xs text-gray-500">
                              <div>Date: {award.date_awarded}</div>
                              <div>Session/Term: {award.session} - {award.term}</div>
                              <div>Awarded By: {award.awarded_by}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No awards received yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Student Profile</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={editData.first_name || ''}
                  onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={editData.last_name || ''}
                  onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input
                  value={editData.middle_name || ''}
                  onChange={(e) => setEditData({ ...editData, middle_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={editData.date_of_birth || ''}
                  onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={editData.gender || ''} onValueChange={(value) => setEditData({ ...editData, gender: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Class</Label>
                <Input
                  value={editData.current_class || ''}
                  onChange={(e) => setEditData({ ...editData, current_class: e.target.value })}
                />
              </div>
              <div>
                <Label>State of Origin</Label>
                <Select value={editData.state_of_origin || ''} onValueChange={(value) => {
                  setEditData({ ...editData, state_of_origin: value, local_government: '' });
                  setSelectedState(value);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {nigerianStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local Government</Label>
                <Select value={editData.local_government || ''} onValueChange={(value) => setEditData({ ...editData, local_government: value })}>
                  <SelectTrigger><SelectValue placeholder="Select LGA" /></SelectTrigger>
                  <SelectContent>
                    {getLGAsByState(selectedState).map(lga => (
                      <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tribe</Label>
                <Select value={editData.tribe || ''} onValueChange={(value) => setEditData({ ...editData, tribe: value })}>
                  <SelectTrigger><SelectValue placeholder="Select tribe" /></SelectTrigger>
                  <SelectContent>
                    {nigerianTribes.map(tribe => (
                      <SelectItem key={tribe} value={tribe}>{tribe}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Blood Group</Label>
                <Select value={editData.blood_group || ''} onValueChange={(value) => setEditData({ ...editData, blood_group: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Genotype</Label>
                <Select value={editData.genotype || ''} onValueChange={(value) => setEditData({ ...editData, genotype: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['AA', 'AS', 'SS', 'AC', 'SC'].map(gt => (
                      <SelectItem key={gt} value={gt}>{gt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sport House</Label>
                <Select value={editData.sport_house || ''} onValueChange={(value) => setEditData({ ...editData, sport_house: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Red House', 'Blue House', 'Green House', 'Yellow House'].map(house => (
                      <SelectItem key={house} value={house}>{house}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Parent Name</Label>
                <Input
                  value={editData.parent_name || ''}
                  onChange={(e) => setEditData({ ...editData, parent_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Parent Phone</Label>
                <Input
                  value={editData.parent_phone || ''}
                  onChange={(e) => setEditData({ ...editData, parent_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Parent Email</Label>
                <Input
                  type="email"
                  value={editData.parent_email || ''}
                  onChange={(e) => setEditData({ ...editData, parent_email: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditStudent}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}