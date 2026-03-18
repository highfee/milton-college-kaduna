import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { School, Users, GraduationCap, UserCircle, Shield, Star, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PortalLogin() {
  const [settings, setSettings] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settingsData = await base44.entities.SchoolSettings.list();
    if (settingsData[0]) {
      setSettings(settingsData[0]);
    }
  };

  // These portals have their own independent login (staff ID / admission number / parent ID)
  const SELF_AUTH_PORTALS = ['TeacherPortal', 'HeadTeacherPortal', 'PrincipalPortal', 'StudentPortal', 'ParentPortal'];

  const handlePortalSelect = async (portal) => {
    // Self-authenticating portals don't need platform auth
    if (SELF_AUTH_PORTALS.includes(portal)) {
      navigate(createPageUrl(portal));
      return;
    }
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(createPageUrl(portal));
    } else {
      navigate(createPageUrl(portal));
    }
  };

  const portals = [
    {
      id: 'AdminPortal',
      title: 'Admin Portal',
      description: 'Access administrative functions and manage school operations',
      icon: Shield,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600'
    },
    {
      id: 'TeacherPortal',
      title: 'Teacher Portal',
      description: 'Manage classes, enter results, and track student progress',
      icon: Users,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'StudentPortal',
      title: 'Student Portal',
      description: 'View results, assignments, and class information',
      icon: GraduationCap,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      id: 'ParentPortal',
      title: 'Parent Portal',
      description: "Monitor your child's academic progress and performance",
      icon: UserCircle,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      id: 'HeadTeacherPortal',
      title: 'Head Teacher Portal',
      description: 'Class Teacher · Form Teacher · Head Teacher functions in one place',
      icon: Star,
      color: 'bg-amber-600',
      hoverColor: 'hover:bg-amber-700'
    },
    {
      id: 'PrincipalPortal',
      title: "Principal's Portal",
      description: 'School-wide oversight: review results, manage teachers and students',
      icon: Shield,
      color: 'bg-[#1e3a5f]',
      hoverColor: 'hover:bg-[#2c4a6e]'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <School className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {settings?.school_name || 'Milton College of Arts and Science, Kaduna'}
              </h1>
              <p className="text-sm text-gray-500">Select Your Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Selection */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to the School Portal</h2>
          <p className="text-gray-600">Choose your portal to access the system</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Card 
                key={portal.id}
                className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => handlePortalSelect(portal.id)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 ${portal.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{portal.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <CardDescription className="text-sm mb-4">
                    {portal.description}
                  </CardDescription>
                  <Button className={`w-full ${portal.color} text-white ${portal.hoverColor}`}>
                    Access Portal
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Need help? Contact the school administration</p>
          <p className="mt-2">{settings?.phone} | {settings?.email}</p>
        </div>
      </div>
    </div>
  );
}