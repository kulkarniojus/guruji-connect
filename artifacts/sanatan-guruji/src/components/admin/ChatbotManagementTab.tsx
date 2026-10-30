import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Plus, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Users, 
  Settings,
  Save,
  Loader2 
} from 'lucide-react';

interface ChatbotTemplate {
  id: number;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatbotSettings {
  welcomeMessage: string;
  fallbackMessage: string;
  isEnabled: boolean;
  maxResponseTime: number;
}

export default function ChatbotManagementTab() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChatbotTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for chatbot templates
  const [templates, setTemplates] = useState<ChatbotTemplate[]>([
    {
      id: 1,
      name: 'Welcome Message',
      content: 'Welcome to Vaidik Dhara! How can I assist you with your spiritual needs today?',
      isActive: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
    {
      id: 2,
      name: 'Booking Inquiry',
      content: 'I can help you book a puja or consultation. What type of service are you looking for?',
      isActive: true,
      createdAt: '2023-01-02',
      updatedAt: '2023-01-02'
    },
    {
      id: 3,
      name: 'Puja Information',
      content: 'I can provide information about various pujas and their benefits. Which puja would you like to know about?',
      isActive: true,
      createdAt: '2023-01-03',
      updatedAt: '2023-01-03'
    }
  ]);

  const [settings, setSettings] = useState<ChatbotSettings>({
    welcomeMessage: 'Hello! Welcome to Vaidik Dhara. How can I help you today?',
    fallbackMessage: 'I\'m sorry, I didn\'t understand that. Could you please rephrase your question?',
    isEnabled: true,
    maxResponseTime: 5000
  });

  const [formData, setFormData] = useState({
    name: '',
    content: ''
  });

  const handleAddTemplate = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const newTemplate: ChatbotTemplate = {
        id: Date.now(),
        name: formData.name,
        content: formData.content,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setTemplates(prev => [...prev, newTemplate]);
      setFormData({ name: '', content: '' });
      setIsAddDialogOpen(false);
      setIsLoading(false);
      
      toast({
        title: 'Success',
        description: 'Chatbot template created successfully',
      });
    }, 1000);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setTemplates(prev => prev.map(template => 
        template.id === selectedTemplate.id 
          ? { ...template, name: formData.name, content: formData.content, updatedAt: new Date().toISOString() }
          : template
      ));
      
      setFormData({ name: '', content: '' });
      setSelectedTemplate(null);
      setIsEditDialogOpen(false);
      setIsLoading(false);
      
      toast({
        title: 'Success',
        description: 'Chatbot template updated successfully',
      });
    }, 1000);
  };

  const handleDeleteTemplate = (id: number) => {
    setTemplates(prev => prev.filter(template => template.id !== id));
    toast({
      title: 'Success',
      description: 'Chatbot template deleted successfully',
    });
  };

  const handleToggleTemplate = (id: number) => {
    setTemplates(prev => prev.map(template => 
      template.id === id 
        ? { ...template, isActive: !template.isActive }
        : template
    ));
  };

  const handleSaveSettings = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Success',
        description: 'Chatbot settings saved successfully',
      });
    }, 1000);
  };

  const openEditDialog = (template: ChatbotTemplate) => {
    setSelectedTemplate(template);
    setFormData({ name: template.name, content: template.content });
    setIsEditDialogOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Bot className="h-5 w-5 mr-2" />
              Chatbot Management
            </CardTitle>
            <CardDescription>
              Manage chatbot templates, responses, and settings for customer interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="templates">
              <TabsList className="mb-4">
                <TabsTrigger value="templates" className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="templates">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Response Templates</h3>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Content</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.name}</TableCell>
                            <TableCell className="max-w-xs truncate">{template.content}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={template.isActive}
                                  onCheckedChange={() => handleToggleTemplate(template.id)}
                                />
                                <Badge variant={template.isActive ? 'default' : 'secondary'}>
                                  {template.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openEditDialog(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Chatbot Analytics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Total Conversations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">1,234</div>
                        <p className="text-xs text-muted-foreground">+12% from last month</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Response Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">94.5%</div>
                        <p className="text-xs text-muted-foreground">+2.1% from last month</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Avg Response Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">1.2s</div>
                        <p className="text-xs text-muted-foreground">-0.3s from last month</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Chatbot Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="chatbot-enabled"
                        checked={settings.isEnabled}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, isEnabled: checked }))}
                      />
                      <Label htmlFor="chatbot-enabled">Enable Chatbot</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="welcome-message">Welcome Message</Label>
                      <Textarea
                        id="welcome-message"
                        value={settings.welcomeMessage}
                        onChange={(e) => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                        placeholder="Enter welcome message..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fallback-message">Fallback Message</Label>
                      <Textarea
                        id="fallback-message"
                        value={settings.fallbackMessage}
                        onChange={(e) => setSettings(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                        placeholder="Enter fallback message..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="response-time">Max Response Time (ms)</Label>
                      <Input
                        id="response-time"
                        type="number"
                        value={settings.maxResponseTime}
                        onChange={(e) => setSettings(prev => ({ ...prev, maxResponseTime: parseInt(e.target.value) }))}
                        placeholder="5000"
                      />
                    </div>
                    
                    <Button onClick={handleSaveSettings} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Settings
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Chatbot Template</DialogTitle>
            <DialogDescription>
              Create a new response template for the chatbot
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Booking Inquiry"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-content">Content</Label>
              <Textarea
                id="template-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the response content..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTemplate} disabled={isLoading || !formData.name || !formData.content}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Chatbot Template</DialogTitle>
            <DialogDescription>
              Update the response template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Booking Inquiry"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-content">Content</Label>
              <Textarea
                id="edit-template-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the response content..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTemplate} disabled={isLoading || !formData.name || !formData.content}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}