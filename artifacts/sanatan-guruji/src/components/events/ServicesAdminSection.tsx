import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServicesManagementTab from "@/components/admin/ServicesManagementTab";
import EventsManagement from "./EventsManagement";

export default function ServicesAdminSection() {
  return (
    <Tabs defaultValue="services-list">
      <TabsList className="mb-4">
        <TabsTrigger value="services-list" data-testid="tab-services-list">Services</TabsTrigger>
        <TabsTrigger value="events" data-testid="tab-events">Events</TabsTrigger>
      </TabsList>
      <TabsContent value="services-list"><ServicesManagementTab /></TabsContent>
      <TabsContent value="events"><EventsManagement /></TabsContent>
    </Tabs>
  );
}
