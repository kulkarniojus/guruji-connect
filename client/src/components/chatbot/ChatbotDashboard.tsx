import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, MessageSquare, BookText, Send, Trash2, Edit, Plus, RotateCw } from 'lucide-react';

const INTENT_TYPES = [
  'greeting',
  'booking_inquiry',
  'puja_information',
  'guruji_availability',
  'payment_issue',
  'cancel_booking',
  'reschedule_booking',
  'general_inquiry',
  'technical_support',
  'other'
];

type Template = {
  id: number;
  name: string;
  description: string;
  content: string;
  intent: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type TrainingData = {
  id: number;
  text: string;
  intent: string;
  entities: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

type Conversation = {
  id: number;
  whatsappUserId: number;
  whatsappUser: {
    id: number;
    whatsappNumber: string;
    userId: number | null;
    user: { firstName: string; lastName: string } | null;
  };
  isActive: boolean;
  lastMessageAt: string;
  messages: Message[];
};

type Message = {
  id: number;
  direction: 'inbound' | 'outbound';
  messageContent: string;
  mediaUrl: string | null;
  intent: string | null;
  createdAt: string;
};

export default function ChatbotDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('conversations');

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">WhatsApp ChatBot Management</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="conversations">
            <MessageSquare className="mr-2 h-4 w-4" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="templates">
            <BookText className="mr-2 h-4 w-4" />
            Message Templates
          </TabsTrigger>
          <TabsTrigger value="training">
            <RotateCw className="mr-2 h-4 w-4" />
            Training Data
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="conversations" className="space-y-4">
          <ConversationsTab />
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <TemplatesTab />
        </TabsContent>
        
        <TabsContent value="training" className="space-y-4">
          <TrainingDataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConversationsTab() {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['/api/chatbot/conversations'],
    retry: false
  });

  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const sendReplyMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: number, message: string }) => {
      const response = await apiRequest('POST', `/api/chatbot/conversations/${conversationId}/reply`, { message });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Message sent successfully' });
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/conversations'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to send message', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSendReply = (conversationId: number) => {
    if (!replyText.trim()) return;
    sendReplyMutation.mutate({ conversationId, message: replyText });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No WhatsApp conversations found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-240px)]">
      {/* Conversations List */}
      <div className="col-span-1 border rounded-lg overflow-auto">
        <div className="p-3 border-b bg-muted font-medium">Recent Conversations</div>
        <div className="divide-y">
          {conversations.map((convo: Conversation) => (
            <div
              key={convo.id}
              className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                selectedConversation === convo.id ? 'bg-muted' : ''
              }`}
              onClick={() => setSelectedConversation(convo.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">
                    {convo.whatsappUser.user 
                      ? `${convo.whatsappUser.user.firstName} ${convo.whatsappUser.user.lastName}`
                      : convo.whatsappUser.whatsappNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {convo.messages && convo.messages.length > 0 
                      ? convo.messages[0].messageContent 
                      : 'No messages'}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">
                    {new Date(convo.lastMessageAt).toLocaleDateString()}
                  </span>
                  {convo.isActive && (
                    <Badge variant="outline" className="mt-1">Active</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message View */}
      <div className="col-span-2 border rounded-lg flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-3 border-b bg-muted font-medium">
              {conversations.find((c: Conversation) => c.id === selectedConversation)?.whatsappUser.whatsappNumber}
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {conversations
                .find((c: Conversation) => c.id === selectedConversation)
                ?.messages.map((msg: Message) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p>{msg.messageContent}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs opacity-70">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                        {msg.intent && (
                          <Badge
                            variant={msg.direction === 'outbound' ? 'outline' : 'secondary'}
                            className="text-xs ml-2"
                          >
                            {msg.intent}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            
            <div className="p-3 border-t">
              <div className="flex space-x-2">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(selectedConversation);
                    }
                  }}
                />
                <Button
                  onClick={() => handleSendReply(selectedConversation)}
                  disabled={sendReplyMutation.isPending}
                >
                  {sendReplyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/chatbot/templates'],
    retry: false
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/chatbot/templates', template);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Template created successfully' });
      setIsEditing(false);
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/templates'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create template', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<Template> & { id: number }) => {
      const response = await apiRequest('PUT', `/api/chatbot/templates/${template.id}`, template);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Template updated successfully' });
      setIsEditing(false);
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/templates'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update template', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/chatbot/templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Template deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/templates'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete template', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const toggleTemplateStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest('PUT', `/api/chatbot/templates/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/templates'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update template status', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    // Split variables by comma and trim
    const variables = editingTemplate.variables 
      ? (typeof editingTemplate.variables === 'string' 
          ? editingTemplate.variables.split(',').map(v => v.trim())
          : editingTemplate.variables)
      : [];
    
    const templateData = {
      ...editingTemplate,
      variables
    };
    
    if (editingTemplate.id) {
      updateTemplateMutation.mutate(templateData as Template);
    } else {
      createTemplateMutation.mutate(templateData as Omit<Template, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate({
      ...template,
      variables: template.variables.join(', ')
    });
    setIsEditing(true);
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleTemplateStatusMutation.mutate({
      id,
      isActive: !currentStatus
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Message Templates</h2>
        {!isEditing && (
          <Button onClick={() => {
            setEditingTemplate({
              name: '',
              description: '',
              content: '',
              intent: 'greeting',
              variables: '',
              isActive: true
            });
            setIsEditing(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        )}
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingTemplate?.id ? 'Edit Template' : 'Create Template'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={editingTemplate?.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate!, name: e.target.value })}
                  placeholder="e.g., booking_confirmation"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="intent">Intent</Label>
                <Select
                  value={editingTemplate?.intent || 'greeting'}
                  onValueChange={(value) => setEditingTemplate({ ...editingTemplate!, intent: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select intent" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENT_TYPES.map((intent) => (
                      <SelectItem key={intent} value={intent}>
                        {intent.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editingTemplate?.description || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate!, description: e.target.value })}
                placeholder="Short description of when this template is used"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={editingTemplate?.content || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate!, content: e.target.value })}
                placeholder="Hello {firstName}, thank you for your inquiry about {pujaName}..."
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{variable}'} placeholders for dynamic content
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="variables">Variables (comma separated)</Label>
              <Input
                id="variables"
                value={editingTemplate?.variables || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate!, variables: e.target.value })}
                placeholder="firstName, lastName, pujaName"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={editingTemplate?.isActive}
                onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate!, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setEditingTemplate(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={
                createTemplateMutation.isPending || 
                updateTemplateMutation.isPending ||
                !editingTemplate?.name ||
                !editingTemplate?.content
              }
            >
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Template
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates && templates.length > 0 ? (
            templates.map((template: Template) => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Badge variant={template.isActive ? 'default' : 'outline'}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="bg-muted rounded-md p-3 text-sm">
                    <p>{template.content}</p>
                  </div>
                  <div className="mt-3">
                    <h4 className="text-sm font-medium">Variables:</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="outline">{variable}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge variant="secondary">{template.intent}</Badge>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex items-center">
                    <Switch
                      id={`template-status-${template.id}`}
                      checked={template.isActive}
                      onCheckedChange={() => handleToggleStatus(template.id, template.isActive)}
                    />
                    <Label htmlFor={`template-status-${template.id}`} className="ml-2">
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-2 text-center p-8 border rounded-lg">
              <p className="text-muted-foreground">No templates found. Create one to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TrainingDataTab() {
  const { data: trainingData, isLoading } = useQuery({
    queryKey: ['/api/chatbot/training-data'],
    retry: false
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<Partial<TrainingData> | null>(null);

  const createTrainingDataMutation = useMutation({
    mutationFn: async (data: Omit<TrainingData, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/chatbot/training-data', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Training data added successfully' });
      setIsEditing(false);
      setEditingData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/training-data'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to add training data', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateTrainingDataMutation = useMutation({
    mutationFn: async (data: Partial<TrainingData> & { id: number }) => {
      const response = await apiRequest('PUT', `/api/chatbot/training-data/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Training data updated successfully' });
      setIsEditing(false);
      setEditingData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/training-data'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update training data', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteTrainingDataMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/chatbot/training-data/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Training data deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/training-data'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete training data', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const trainModelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/chatbot/train');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Model trained successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to train model', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSaveTrainingData = () => {
    if (!editingData) return;
    
    // Parse entities JSON string
    let parsedEntities = {};
    if (typeof editingData.entities === 'string') {
      try {
        parsedEntities = JSON.parse(editingData.entities || '{}');
      } catch (error) {
        toast({ 
          title: 'Invalid entities JSON', 
          description: 'Please ensure the entities field contains valid JSON',
          variant: 'destructive'
        });
        return;
      }
    } else {
      parsedEntities = editingData.entities || {};
    }
    
    const trainingDataItem = {
      ...editingData,
      entities: parsedEntities
    };
    
    if (editingData.id) {
      updateTrainingDataMutation.mutate(trainingDataItem as TrainingData);
    } else {
      createTrainingDataMutation.mutate(trainingDataItem as Omit<TrainingData, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const handleDeleteTrainingData = (id: number) => {
    if (confirm('Are you sure you want to delete this training data?')) {
      deleteTrainingDataMutation.mutate(id);
    }
  };

  const handleEditTrainingData = (data: TrainingData) => {
    setEditingData({
      ...data,
      entities: typeof data.entities === 'object' 
        ? JSON.stringify(data.entities, null, 2) 
        : data.entities
    });
    setIsEditing(true);
  };

  const handleTrainModel = () => {
    if (confirm('Are you sure you want to train the model? This may take a few minutes.')) {
      trainModelMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Training Data</h2>
        <div className="flex space-x-2">
          {!isEditing && (
            <Button onClick={() => {
              setEditingData({
                text: '',
                intent: 'greeting',
                entities: '{}'
              });
              setIsEditing(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Training Data
            </Button>
          )}
          <Button onClick={handleTrainModel} disabled={trainModelMutation.isPending}>
            {trainModelMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            Train Model
          </Button>
        </div>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingData?.id ? 'Edit Training Data' : 'Add Training Data'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Training Text</Label>
              <Textarea
                id="text"
                value={editingData?.text || ''}
                onChange={(e) => setEditingData({ ...editingData!, text: e.target.value })}
                placeholder="e.g., I want to book a puja for tomorrow"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="intent">Intent</Label>
              <Select
                value={editingData?.intent || 'greeting'}
                onValueChange={(value) => setEditingData({ ...editingData!, intent: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select intent" />
                </SelectTrigger>
                <SelectContent>
                  {INTENT_TYPES.map((intent) => (
                    <SelectItem key={intent} value={intent}>
                      {intent.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entities">Entities (JSON)</Label>
              <Textarea
                id="entities"
                value={typeof editingData?.entities === 'string' 
                  ? editingData.entities 
                  : JSON.stringify(editingData?.entities || {}, null, 2)}
                onChange={(e) => setEditingData({ ...editingData!, entities: e.target.value })}
                placeholder='{
  "puja_type": "satyanarayan",
  "date": "tomorrow"
}'
                rows={5}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter entities as a JSON object or leave empty
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setEditingData(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTrainingData}
              disabled={
                createTrainingDataMutation.isPending || 
                updateTrainingDataMutation.isPending ||
                !editingData?.text ||
                !editingData?.intent
              }
            >
              {(createTrainingDataMutation.isPending || updateTrainingDataMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Training Data
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-4">
          {trainingData && trainingData.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {trainingData.map((data: TrainingData) => (
                <Card key={data.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <p className="flex-1">{data.text}</p>
                      <Badge className="ml-4">{data.intent}</Badge>
                    </div>
                    
                    {Object.keys(data.entities || {}).length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Entities:</p>
                        <div className="bg-muted rounded-md p-2 mt-1">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(data.entities, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-3 space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTrainingData(data)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTrainingData(data.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <p className="text-muted-foreground">No training data found. Add examples to train the chatbot.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}