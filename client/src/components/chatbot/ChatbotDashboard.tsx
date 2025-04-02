import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Loader2, Save, PlusCircle, Trash, Edit, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Define TypeScript interfaces for our data
interface Template {
  id: number;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TrainingData {
  id: number;
  intent: string;
  utterances: string[];
  responses: string[];
  entities?: {
    [key: string]: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: number;
  userId: number;
  whatsappNumber: string;
  status: 'active' | 'closed';
  messages: {
    id: number;
    text: string;
    fromUser: boolean;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  mobile: string;
  whatsappOptIn: boolean;
  whatsappLinked: boolean;
}

// Form schemas
const templateSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  isActive: z.boolean().default(true)
});

const trainingDataSchema = z.object({
  intent: z.string().min(2, "Intent must be at least 2 characters"),
  utterances: z.string().min(5, "Utterances must be at least 5 characters"),
  responses: z.string().min(5, "Responses must be at least 5 characters"),
  entities: z.string().optional()
});

const ChatbotDashboard: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  
  // Template state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Training data state
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [selectedTrainingData, setSelectedTrainingData] = useState<TrainingData | null>(null);
  
  // Conversation state
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  
  // Forms setup
  const templateForm = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      content: "",
      isActive: true
    }
  });
  
  const trainingForm = useForm<z.infer<typeof trainingDataSchema>>({
    resolver: zodResolver(trainingDataSchema),
    defaultValues: {
      intent: "",
      utterances: "",
      responses: "",
      entities: ""
    }
  });
  
  // Queries
  const { 
    data: templates, 
    isLoading: isLoadingTemplates
  } = useQuery<Template[]>({
    queryKey: ['/api/chatbot/templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/chatbot/templates');
      return response.json();
    }
  });
  
  const { 
    data: trainingData, 
    isLoading: isLoadingTrainingData
  } = useQuery<TrainingData[]>({
    queryKey: ['/api/chatbot/training-data'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/chatbot/training-data');
      return response.json();
    }
  });
  
  const { 
    data: conversations, 
    isLoading: isLoadingConversations
  } = useQuery<Conversation[]>({
    queryKey: ['/api/chatbot/conversations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/chatbot/conversations');
      return response.json();
    }
  });
  
  const { 
    data: selectedConversationData,
    isLoading: isLoadingConversationData,
    refetch: refetchConversation
  } = useQuery<Conversation>({
    queryKey: ['/api/chatbot/conversations', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) throw new Error("No conversation selected");
      const response = await apiRequest('GET', `/api/chatbot/conversations/${selectedConversation}`);
      return response.json();
    },
    enabled: !!selectedConversation
  });
  
  const { 
    data: chatbotUsers, 
    isLoading: isLoadingUsers
  } = useQuery<User[]>({
    queryKey: ['/api/chatbot/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/chatbot/users');
      return response.json();
    }
  });
  
  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: z.infer<typeof templateSchema>) => {
      const response = await apiRequest('POST', '/api/chatbot/templates', templateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/templates'] });
      toast({
        title: "Template created",
        description: "The template has been created successfully"
      });
      templateForm.reset();
      setIsTemplateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof templateSchema> }) => {
      const response = await apiRequest('PUT', `/api/chatbot/templates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/templates'] });
      toast({
        title: "Template updated",
        description: "The template has been updated successfully"
      });
      templateForm.reset();
      setIsTemplateDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/chatbot/templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/templates'] });
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const createTrainingDataMutation = useMutation({
    mutationFn: async (trainingData: z.infer<typeof trainingDataSchema>) => {
      // Transform string data to arrays
      const formattedData = {
        intent: trainingData.intent,
        utterances: trainingData.utterances.split('\n').map(v => v.trim()).filter(v => v),
        responses: trainingData.responses.split('\n').map(v => v.trim()).filter(v => v),
        entities: trainingData.entities 
          ? JSON.parse(trainingData.entities)
          : {}
      };
      
      const response = await apiRequest('POST', '/api/chatbot/training-data', formattedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/training-data'] });
      toast({
        title: "Training data created",
        description: "The training data has been created successfully"
      });
      trainingForm.reset();
      setIsTrainingDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating training data",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const updateTrainingDataMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof trainingDataSchema> }) => {
      // Transform string data to arrays
      const formattedData = {
        intent: data.intent,
        utterances: data.utterances.split('\n').map(v => v.trim()).filter(v => v),
        responses: data.responses.split('\n').map(v => v.trim()).filter(v => v),
        entities: data.entities 
          ? JSON.parse(data.entities)
          : {}
      };
      
      const response = await apiRequest('PUT', `/api/chatbot/training-data/${id}`, formattedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/training-data'] });
      toast({
        title: "Training data updated",
        description: "The training data has been updated successfully"
      });
      trainingForm.reset();
      setIsTrainingDialogOpen(false);
      setSelectedTrainingData(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating training data",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const deleteTrainingDataMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/chatbot/training-data/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/training-data'] });
      toast({
        title: "Training data deleted",
        description: "The training data has been deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting training data",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const trainModelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/chatbot/train');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Model trained",
        description: "The chatbot model has been trained successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error training model",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const sendReplyMutation = useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: number, text: string }) => {
      const response = await apiRequest('POST', `/api/chatbot/conversations/${conversationId}/reply`, { text });
      return response.json();
    },
    onSuccess: () => {
      setReplyText("");
      refetchConversation();
      toast({
        title: "Reply sent",
        description: "Your reply has been sent successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending reply",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const updateConversationStatusMutation = useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: number, status: 'active' | 'closed' }) => {
      const response = await apiRequest('PUT', `/api/chatbot/conversations/${conversationId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/conversations'] });
      refetchConversation();
      toast({
        title: "Status updated",
        description: "The conversation status has been updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const linkWhatsappMutation = useMutation({
    mutationFn: async ({ userId, whatsappNumber }: { userId: number, whatsappNumber: string }) => {
      const response = await apiRequest('PUT', `/api/chatbot/users/${userId}/link`, { whatsappNumber });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/users'] });
      toast({
        title: "WhatsApp linked",
        description: "The WhatsApp number has been linked successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error linking WhatsApp",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const optOutWhatsappMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('PUT', `/api/chatbot/users/${userId}/opt-out`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/users'] });
      toast({
        title: "Opt-out successful",
        description: "User has been opted out from WhatsApp messages"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error opting out",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle form submissions
  const handleTemplateSubmit = (data: z.infer<typeof templateSchema>) => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };
  
  const handleTrainingDataSubmit = (data: z.infer<typeof trainingDataSchema>) => {
    if (selectedTrainingData) {
      updateTrainingDataMutation.mutate({ id: selectedTrainingData.id, data });
    } else {
      createTrainingDataMutation.mutate(data);
    }
  };
  
  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    templateForm.reset({
      name: template.name,
      content: template.content,
      isActive: template.isActive
    });
    setIsTemplateDialogOpen(true);
  };
  
  const handleEditTrainingData = (data: TrainingData) => {
    setSelectedTrainingData(data);
    trainingForm.reset({
      intent: data.intent,
      utterances: data.utterances.join('\n'),
      responses: data.responses.join('\n'),
      entities: data.entities ? JSON.stringify(data.entities, null, 2) : undefined
    });
    setIsTrainingDialogOpen(true);
  };
  
  const handleCloseTemplateDialog = () => {
    templateForm.reset();
    setSelectedTemplate(null);
    setIsTemplateDialogOpen(false);
  };
  
  const handleCloseTrainingDialog = () => {
    trainingForm.reset();
    setSelectedTrainingData(null);
    setIsTrainingDialogOpen(false);
  };
  
  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !replyText.trim()) return;
    
    sendReplyMutation.mutate({
      conversationId: selectedConversation,
      text: replyText
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">WhatsApp ChatBot Management</h2>
        
        <Button 
          onClick={() => trainModelMutation.mutate()}
          disabled={trainModelMutation.isPending}
        >
          {trainModelMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Training...</>
          ) : (
            <><RefreshCw className="mr-2 h-4 w-4" /> Train Model</>
          )}
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="training">Training Data</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="users">WhatsApp Users</TabsTrigger>
        </TabsList>
        
        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              templateForm.reset();
              setSelectedTemplate(null);
              setIsTemplateDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Template
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>
                Define templates for automated WhatsApp messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : templates && templates.length > 0 ? (
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
                        <TableCell className="max-w-md truncate">{template.content}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            template.isActive 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {template.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this template?")) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found. Create your first template to get started.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Template Dialog */}
          <Dialog open={isTemplateDialogOpen} onOpenChange={handleCloseTemplateDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedTemplate ? "Edit Template" : "Create Template"}
                </DialogTitle>
                <DialogDescription>
                  {selectedTemplate 
                    ? "Update the template details below"
                    : "Fill in the template details below"
                  }
                </DialogDescription>
              </DialogHeader>
              
              <Form {...templateForm}>
                <form onSubmit={templateForm.handleSubmit(handleTemplateSubmit)} className="space-y-6">
                  <FormField
                    control={templateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Booking Confirmation" {...field} />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for the template
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={templateForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter the template content with placeholders like {{name}}" 
                            className="min-h-[150px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Use {{placeholders}} for dynamic content
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={templateForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel>Active</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={
                      createTemplateMutation.isPending || updateTemplateMutation.isPending
                    }>
                      {createTemplateMutation.isPending || updateTemplateMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save Template</>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        {/* Training Data Tab */}
        <TabsContent value="training" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              trainingForm.reset();
              setSelectedTrainingData(null);
              setIsTrainingDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Training Data
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>NLP Training Data</CardTitle>
              <CardDescription>
                Define intents, utterances, and responses for the chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrainingData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : trainingData && trainingData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Intent</TableHead>
                      <TableHead>Utterances</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingData.map((data) => (
                      <TableRow key={data.id}>
                        <TableCell className="font-medium">{data.intent}</TableCell>
                        <TableCell>
                          <div className="max-h-20 overflow-y-auto">
                            <ul className="list-disc list-inside">
                              {data.utterances.slice(0, 3).map((utterance, idx) => (
                                <li key={idx} className="text-sm">{utterance}</li>
                              ))}
                              {data.utterances.length > 3 && (
                                <li className="text-xs text-muted-foreground">
                                  +{data.utterances.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-h-20 overflow-y-auto">
                            <ul className="list-disc list-inside">
                              {data.responses.slice(0, 3).map((response, idx) => (
                                <li key={idx} className="text-sm">{response}</li>
                              ))}
                              {data.responses.length > 3 && (
                                <li className="text-xs text-muted-foreground">
                                  +{data.responses.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditTrainingData(data)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this training data?")) {
                                deleteTrainingDataMutation.mutate(data.id);
                              }
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No training data found. Add your first intent to get started.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Training Data Dialog */}
          <Dialog open={isTrainingDialogOpen} onOpenChange={handleCloseTrainingDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedTrainingData ? "Edit Training Data" : "Add Training Data"}
                </DialogTitle>
                <DialogDescription>
                  {selectedTrainingData 
                    ? "Update the intent, utterances, and responses"
                    : "Add a new intent with example utterances and responses"
                  }
                </DialogDescription>
              </DialogHeader>
              
              <Form {...trainingForm}>
                <form onSubmit={trainingForm.handleSubmit(handleTrainingDataSubmit)} className="space-y-6">
                  <FormField
                    control={trainingForm.control}
                    name="intent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intent Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. greeting, booking_inquiry" {...field} />
                        </FormControl>
                        <FormDescription>
                          A unique identifier for this intent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trainingForm.control}
                    name="utterances"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Utterances</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter one example per line, e.g.:\nHello\nHi there\nGood morning" 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Enter example phrases users might say (one per line)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trainingForm.control}
                    name="responses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responses</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter one response per line, e.g.:\nHello! How can I help you?\nGreetings! What can I do for you today?" 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Enter possible bot responses (one per line)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trainingForm.control}
                    name="entities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entities (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder='Enter as JSON, e.g.:\n{\n  "puja_type": ["havan", "katha"],\n  "location": ["delhi", "mumbai"]\n}' 
                            className="min-h-[120px] font-mono text-sm"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Enter entities in JSON format (advanced)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={
                      createTrainingDataMutation.isPending || updateTrainingDataMutation.isPending
                    }>
                      {createTrainingDataMutation.isPending || updateTrainingDataMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save Training Data</>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        {/* Conversations Tab */}
        <TabsContent value="conversations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Active Conversations</CardTitle>
                  <CardDescription>
                    Recent WhatsApp conversations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingConversations ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : conversations && conversations.length > 0 ? (
                    <div className="space-y-2">
                      {conversations.map((conversation) => (
                        <div 
                          key={conversation.id} 
                          className={`p-3 rounded-md cursor-pointer transition-colors ${
                            selectedConversation === conversation.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => setSelectedConversation(conversation.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="font-medium">+{conversation.whatsappNumber}</div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              conversation.status === 'active'
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {conversation.status}
                            </span>
                          </div>
                          <div className="text-sm opacity-80 truncate">
                            {conversation.messages && conversation.messages.length > 0
                              ? conversation.messages[conversation.messages.length - 1].text
                              : "No messages"}
                          </div>
                          <div className="text-xs mt-1 opacity-70">
                            {new Date(conversation.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No active conversations.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {selectedConversationData 
                          ? `Chat with +${selectedConversationData.whatsappNumber}`
                          : "Conversation"
                        }
                      </CardTitle>
                      <CardDescription>
                        {selectedConversationData 
                          ? `Status: ${selectedConversationData.status}`
                          : "Select a conversation to view"
                        }
                      </CardDescription>
                    </div>
                    
                    {selectedConversationData && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newStatus = selectedConversationData.status === 'active' ? 'closed' : 'active';
                            updateConversationStatusMutation.mutate({
                              conversationId: selectedConversationData.id,
                              status: newStatus
                            });
                          }}
                          disabled={updateConversationStatusMutation.isPending}
                        >
                          {updateConversationStatusMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            selectedConversationData.status === 'active' ? 'Close Chat' : 'Reopen Chat'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-grow overflow-hidden flex flex-col min-h-[400px]">
                  {isLoadingConversationData ? (
                    <div className="flex justify-center items-center flex-grow">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !selectedConversation ? (
                    <div className="flex justify-center items-center flex-grow text-muted-foreground">
                      Select a conversation from the list
                    </div>
                  ) : selectedConversationData ? (
                    <div className="flex flex-col space-y-4 overflow-y-auto flex-grow mb-4">
                      {selectedConversationData.messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.fromUser
                              ? "bg-muted self-start rounded-tl-none"
                              : "bg-primary text-primary-foreground self-end rounded-tr-none"
                          }`}
                        >
                          <div className="text-sm">{message.text}</div>
                          <div className="text-xs mt-1 opacity-70 text-right">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center flex-grow text-muted-foreground">
                      Error loading conversation
                    </div>
                  )}
                  
                  {selectedConversationData && selectedConversationData.status === 'active' && (
                    <form onSubmit={handleReplySubmit} className="mt-auto flex gap-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your message..."
                        disabled={sendReplyMutation.isPending}
                      />
                      <Button 
                        type="submit" 
                        disabled={!replyText.trim() || sendReplyMutation.isPending}
                      >
                        {sendReplyMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Send"
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Users</CardTitle>
              <CardDescription>
                Manage users with WhatsApp integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : chatbotUsers && chatbotUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>WhatsApp Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chatbotUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{user.mobile}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.whatsappLinked
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {user.whatsappLinked ? "Linked" : "Not Linked"}
                          </span>
                          {" "}
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.whatsappOptIn
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {user.whatsappOptIn ? "Opted In" : "Opted Out"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const number = prompt("Enter WhatsApp number (with country code)", user.mobile);
                              if (number) {
                                linkWhatsappMutation.mutate({
                                  userId: user.id,
                                  whatsappNumber: number
                                });
                              }
                            }}
                            disabled={linkWhatsappMutation.isPending}
                          >
                            {linkWhatsappMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Link WhatsApp"
                            )}
                          </Button>
                          
                          {user.whatsappOptIn && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to opt this user out of WhatsApp messages?")) {
                                  optOutWhatsappMutation.mutate(user.id);
                                }
                              }}
                              disabled={optOutWhatsappMutation.isPending}
                            >
                              {optOutWhatsappMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Opt Out"
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No users found with WhatsApp information.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatbotDashboard;