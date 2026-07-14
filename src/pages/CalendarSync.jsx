import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, RefreshCw, Link2, Unlink, LogIn, Bell, Clock } from 'lucide-react';

const CONNECTOR_ID = '6a55fd0048c135f3821a01f5';

export default function CalendarSync() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Rule 2: reusable fetch — doubles as connection check AND sync trigger
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncGoogleCalendar', { connectorId: CONNECTOR_ID });
      setSyncResult(res.data);
      setConnected(true);
    } catch {
      setConnected(false);
      setSyncResult(null);
    } finally {
      setSyncing(false);
    }
  }, []);

  // Rule 1: check auth first, then attempt sync to detect connection status
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        await handleSync();
      }
      setLoading(false);
    });
  }, [handleSync]);

  // Rule 3: open OAuth popup, poll for close, then re-sync
  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        handleSync();
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setSyncResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Rule 1: auth gate
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-xl">
          <CardHeader>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Sign In Required</CardTitle>
            <CardDescription>You need to be signed in to connect your Google Calendar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => base44.auth.redirectToLogin()}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Google Calendar Sync</h1>
            <p className="text-sm text-gray-500">Sync CBT exams and academic events with automatic reminders</p>
          </div>
        </div>

        {/* How it works */}
        <Card className="border-0 shadow-lg mb-6 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">Automatic Reminders</p>
                <p className="text-xs text-blue-700">
                  CBT exams: email 1 day before + popup 30 min before. Academic events: email 1 day before + popup 1 hour before.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Status */}
        {!connected ? (
          <Card className="border-0 shadow-lg mb-6">
            <CardHeader>
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Link2 className="w-7 h-7 text-red-600" />
              </div>
              <CardTitle className="text-center text-xl">Connect Your Google Calendar</CardTitle>
              <CardDescription className="text-center">
                Connect your personal Google Calendar to receive automatic email and popup reminders for upcoming CBT exams and academic calendar events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleConnect}>
                <Link2 className="w-4 h-4" /> Connect Google Calendar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Connected banner */}
            <Card className="border-0 shadow-lg mb-6 bg-green-50">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">Google Calendar Connected</p>
                  <p className="text-sm text-green-700">Signed in as {user.email || user.full_name}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Unlink className="w-4 h-4" /> Disconnect
                </Button>
              </CardContent>
            </Card>

            {/* Sync result */}
            {syncResult && (
              <Card className="border-0 shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Sync Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{syncResult.synced || 0}</p>
                      <p className="text-xs text-blue-600">Events Synced</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-700">{syncResult.examsProcessed || 0}</p>
                      <p className="text-xs text-purple-600">CBT Exams Found</p>
                    </div>
                  </div>
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-amber-800 mb-1">{syncResult.errors.length} item(s) had errors</p>
                      {syncResult.errors.slice(0, 3).map((e, i) => (
                        <p key={i} className="text-xs text-amber-600">• {e.item}: {e.error}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Re-sync anytime to pick up newly published exams and calendar updates.</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sync button */}
            <Button className="w-full" onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Sync Now</>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}