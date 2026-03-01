"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-toastify';
import { CardBody } from '@nextui-org/react';

export default function EmailTest() {
  const [user_id, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const sendTestEmail = async () => {
    if (!user_id) {
      toast.error('Please enter a user ID');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id }),
      });

      if (response.ok) {
        toast.success('Test email sent successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Test</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">User ID</Label>
            <Input
              id="user_id"
              value={user_id}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
            />
          </div>
          
          <Button 
            onClick={sendTestEmail} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send Test Email'}
          </Button>
          
          <p className="text-sm text-gray-600">
            This will send a test upload success email to the user.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
