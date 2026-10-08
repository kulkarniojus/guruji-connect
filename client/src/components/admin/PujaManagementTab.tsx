import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PujaManagement from './PujaManagement';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package2, Presentation, Settings } from 'lucide-react';
import PricingManagement from './PricingManagement';

export default function PujaManagementTab() {
  return (
    <div>
      <div className="flex flex-col space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Puja Configuration</CardTitle>
            <CardDescription>
              Manage puja details including names, rates, descriptions, and durations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pujas">
              <TabsList className="mb-4">
                <TabsTrigger value="pujas" className="flex items-center">
                  <Package2 className="h-4 w-4 mr-2" />
                  Pujas
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center">
                  <Presentation className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pujas">
                <ScrollArea className="h-[65vh]">
                  <div className="space-y-6 pr-4">
                    <PujaManagement />
                    <PricingManagement />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="templates">
                <div className="text-center p-8 text-muted-foreground">
                  <p>Puja templates configuration will be available in a future update.</p>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="text-center p-8 text-muted-foreground">
                  <p>Global puja settings configuration will be available in a future update.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}