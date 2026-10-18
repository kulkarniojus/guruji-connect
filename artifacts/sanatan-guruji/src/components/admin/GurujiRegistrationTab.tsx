import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Users, CheckCircle2 } from 'lucide-react';
import { GurujiApplicationManagement } from './GurujiApplicationManagement';

export default function GurujiRegistrationTab() {
  return (
    <div>
      <div className="flex flex-col space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Guruji Registration Management</CardTitle>
            <CardDescription>
              Review and manage guruji registration applications and approve qualified candidates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="applications">
              <TabsList className="mb-4">
                <TabsTrigger value="applications" className="flex items-center">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Applications
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approved
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  All Gurujis
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="applications">
                <ScrollArea className="h-[65vh]">
                  <GurujiApplicationManagement status="pending" />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="approved">
                <ScrollArea className="h-[65vh]">
                  <GurujiApplicationManagement status="approved" />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="all">
                <ScrollArea className="h-[65vh]">
                  <GurujiApplicationManagement status="all" />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}