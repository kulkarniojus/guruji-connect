import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { 
  Flame, 
  Award, 
  BookOpen, 
  Sparkles, 
  Star, 
  Calendar as CalendarIcon, 
  Check, 
  Plus,
  Clock,
  ChevronRight
} from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Type definitions based on our schema
interface UserJourney {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  stage: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  totalPujas: number;
  completedPujas: number;
  goals: string[] | null;
  achievements: { name: string; date: string; description: string }[] | null;
  nextRecommendation: number | null;
  createdAt: string;
  updatedAt: string;
}

interface UserJourneyItem {
  id: number;
  journeyId: number;
  pujaId: number | null;
  bookingId: number | null;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  reflection: string | null;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

// Form schema for creating a new journey
const newJourneySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  goals: z.string().optional()
});

// Form schema for adding a new journey item
const newJourneyItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  pujaId: z.string().optional(),
  sequence: z.number().min(1, 'Sequence is required')
});

// Form schema for reflection
const reflectionSchema = z.object({
  reflection: z.string().min(1, 'Reflection is required')
});

// Helper function to calculate progress percentage
const calculateProgress = (completed: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Helper function to get color based on stage
const getStageColor = (stage: string) => {
  switch(stage) {
    case 'beginner': return 'bg-blue-500';
    case 'intermediate': return 'bg-green-500';
    case 'advanced': return 'bg-yellow-500';
    case 'expert': return 'bg-orange-500';
    case 'master': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

// Helper function to get icon based on stage
const getStageIcon = (stage: string) => {
  switch(stage) {
    case 'beginner': return <Flame className="h-5 w-5 text-blue-500" />;
    case 'intermediate': return <BookOpen className="h-5 w-5 text-green-500" />;
    case 'advanced': return <Sparkles className="h-5 w-5 text-yellow-500" />;
    case 'expert': return <Star className="h-5 w-5 text-orange-500" />;
    case 'master': return <Award className="h-5 w-5 text-purple-500" />;
    default: return <Flame className="h-5 w-5 text-gray-500" />;
  }
};

const SpiritualJourney = () => {
  const { toast } = useToast();
  const [selectedJourney, setSelectedJourney] = useState<number | null>(null);
  const [isNewJourneyDialogOpen, setIsNewJourneyDialogOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  // Fetch user journeys
  const { 
    data: journeys, 
    isLoading: journeysLoading, 
    error: journeysError 
  } = useQuery({
    queryKey: ['/api/journey'],
    queryFn: () => fetch('/api/journey').then(res => res.json()),
    enabled: true
  });

  // Fetch journey details with items
  const { 
    data: journeyDetails, 
    isLoading: journeyDetailsLoading, 
    error: journeyDetailsError 
  } = useQuery({
    queryKey: ['/api/journey', selectedJourney],
    queryFn: () => fetch(`/api/journey/${selectedJourney}`).then(res => res.json()),
    enabled: !!selectedJourney
  });

  // New Journey form
  const newJourneyForm = useForm<z.infer<typeof newJourneySchema>>({
    resolver: zodResolver(newJourneySchema),
    defaultValues: {
      title: '',
      description: '',
      goals: ''
    }
  });

  // New Journey Item form
  const newJourneyItemForm = useForm<z.infer<typeof newJourneyItemSchema>>({
    resolver: zodResolver(newJourneyItemSchema),
    defaultValues: {
      title: '',
      description: '',
      pujaId: '',
      sequence: 1
    }
  });

  // Reflection form
  const reflectionForm = useForm<z.infer<typeof reflectionSchema>>({
    resolver: zodResolver(reflectionSchema),
    defaultValues: {
      reflection: ''
    }
  });

  // Create journey mutation
  const createJourneyMutation = useMutation({
    mutationFn: (data: z.infer<typeof newJourneySchema>) => {
      // Convert goals string to array
      const goals = data.goals ? data.goals.split(',').map(g => g.trim()).filter(g => g) : null;
      
      return apiRequest('POST', '/api/journey', {
        ...data,
        goals
      });
    },
    onSuccess: () => {
      toast({
        title: 'Journey created',
        description: 'Your spiritual journey has been created successfully.',
      });
      newJourneyForm.reset();
      setIsNewJourneyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/journey'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating journey',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Create journey item mutation
  const createJourneyItemMutation = useMutation({
    mutationFn: (data: z.infer<typeof newJourneyItemSchema>) => {
      return apiRequest('POST', `/api/journey/${selectedJourney}/items`, {
        ...data,
        pujaId: data.pujaId ? parseInt(data.pujaId) : null
      });
    },
    onSuccess: () => {
      toast({
        title: 'Journey milestone added',
        description: 'A new milestone has been added to your journey.',
      });
      newJourneyItemForm.reset();
      setIsNewItemDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/journey', selectedJourney] });
    },
    onError: (error) => {
      toast({
        title: 'Error adding milestone',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Mark item complete mutation
  const markItemCompleteMutation = useMutation({
    mutationFn: (data: { itemId: number, reflection: string }) => {
      return apiRequest('PATCH', `/api/journey/items/${data.itemId}/complete`, {
        reflection: data.reflection
      });
    },
    onSuccess: () => {
      toast({
        title: 'Milestone completed',
        description: 'Your reflection has been saved and the milestone marked as complete.',
      });
      reflectionForm.reset();
      setIsReflectionDialogOpen(false);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ['/api/journey', selectedJourney] });
    },
    onError: (error) => {
      toast({
        title: 'Error completing milestone',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Handle new journey submission
  const onSubmitNewJourney = (data: z.infer<typeof newJourneySchema>) => {
    createJourneyMutation.mutate(data);
  };

  // Handle new journey item submission
  const onSubmitNewJourneyItem = (data: z.infer<typeof newJourneyItemSchema>) => {
    createJourneyItemMutation.mutate(data);
  };

  // Handle reflection submission
  const onSubmitReflection = (data: z.infer<typeof reflectionSchema>) => {
    if (selectedItem) {
      markItemCompleteMutation.mutate({
        itemId: selectedItem,
        reflection: data.reflection
      });
    }
  };

  // Set first journey as selected on load if none selected
  useEffect(() => {
    if (journeys && journeys.length > 0 && !selectedJourney) {
      setSelectedJourney(journeys[0].id);
    }
  }, [journeys, selectedJourney]);

  if (journeysLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (journeysError) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
          Error loading spiritual journeys. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Spiritual Journey</h1>
        <Button onClick={() => setIsNewJourneyDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Journey
        </Button>
      </div>

      {/* No journeys state */}
      {(!journeys || journeys.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Start Your Spiritual Journey</h2>
          <p className="text-gray-500 mb-6 max-w-md">
            Track your progress, set spiritual goals, and reflect on your growth as you connect with our Gurujis.
          </p>
          <Button onClick={() => setIsNewJourneyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Journey
          </Button>
        </div>
      )}

      {/* Journey content */}
      {journeys && journeys.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Journey list sidebar */}
          <div className="md:col-span-1">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium mb-4">Your Journeys</h3>
              <div className="space-y-2">
                {journeys.map((journey: UserJourney) => (
                  <button
                    key={journey.id}
                    onClick={() => setSelectedJourney(journey.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-md text-left ${
                      selectedJourney === journey.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      {getStageIcon(journey.stage)}
                      <div className="ml-3">
                        <div className="font-medium">{journey.title}</div>
                        <div className="text-xs opacity-80">
                          {journey.stage.charAt(0).toUpperCase() + journey.stage.slice(1)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs opacity-80">
                        {calculateProgress(journey.completedPujas, journey.totalPujas)}%
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Journey details */}
          <div className="md:col-span-2">
            {journeyDetailsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : journeyDetailsError ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
                Error loading journey details. Please try again later.
              </div>
            ) : journeyDetails ? (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className={`${getStageColor(journeyDetails.journey.stage)} mb-2`}>
                          {journeyDetails.journey.stage.charAt(0).toUpperCase() + journeyDetails.journey.stage.slice(1)}
                        </Badge>
                        <CardTitle>{journeyDetails.journey.title}</CardTitle>
                        <CardDescription>
                          Started on {new Date(journeyDetails.journey.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Progress</div>
                        <div className="text-3xl font-bold">
                          {calculateProgress(
                            journeyDetails.journey.completedPujas,
                            journeyDetails.journey.totalPujas
                          )}%
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <Progress
                        value={calculateProgress(
                          journeyDetails.journey.completedPujas,
                          journeyDetails.journey.totalPujas
                        )}
                        className="h-2"
                      />
                    </div>
                    {journeyDetails.journey.description && (
                      <p className="text-gray-600 mb-4">{journeyDetails.journey.description}</p>
                    )}
                    {journeyDetails.journey.goals && journeyDetails.journey.goals.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Spiritual Goals</h4>
                        <ul className="space-y-1 list-disc pl-5">
                          {journeyDetails.journey.goals.map((goal: string, index: number) => (
                            <li key={index}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        {journeyDetails.items.filter((item: UserJourneyItem) => item.isCompleted).length} of{' '}
                        {journeyDetails.items.length} milestones completed
                      </span>
                    </div>
                    <Button onClick={() => setIsNewItemDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add Milestone
                    </Button>
                  </CardFooter>
                </Card>

                {/* Journey milestones */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">Journey Milestones</h3>
                  {journeyDetails.items.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h4 className="text-lg font-medium mb-2">No milestones yet</h4>
                      <p className="text-gray-500 mb-4">
                        Add milestones to track your progress on this spiritual journey.
                      </p>
                      <Button onClick={() => setIsNewItemDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Your First Milestone
                      </Button>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {journeyDetails.items
                        .sort((a: UserJourneyItem, b: UserJourneyItem) => a.sequence - b.sequence)
                        .map((item: UserJourneyItem) => (
                          <AccordionItem key={item.id} value={item.id.toString()}>
                            <AccordionTrigger>
                              <div className="flex items-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                    item.isCompleted
                                      ? 'bg-green-100 text-green-600'
                                      : 'bg-gray-100 text-gray-400'
                                  }`}
                                >
                                  {item.isCompleted ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <span>{item.sequence}</span>
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className={item.isCompleted ? 'line-through opacity-70' : ''}>
                                    {item.title}
                                  </div>
                                  {item.isCompleted && item.completedAt && (
                                    <div className="text-xs text-gray-500">
                                      Completed on {new Date(item.completedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {item.description && <p className="mb-4">{item.description}</p>}
                              
                              {item.reflection && (
                                <div className="mb-4">
                                  <h5 className="font-medium mb-2">Your Reflection</h5>
                                  <div className="bg-gray-50 p-4 rounded-md italic">
                                    "{item.reflection}"
                                  </div>
                                </div>
                              )}
                              
                              {!item.isCompleted && (
                                <Button 
                                  variant="outline" 
                                  className="mt-2"
                                  onClick={() => {
                                    setSelectedItem(item.id);
                                    setIsReflectionDialogOpen(true);
                                  }}
                                >
                                  Mark as Complete
                                </Button>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  )}
                </div>

                {/* Achievements section (if any) */}
                {journeyDetails.journey.achievements && journeyDetails.journey.achievements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Award className="h-5 w-5 mr-2" /> Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {journeyDetails.journey.achievements.map((achievement: { name: string; date: string; description: string }, index: number) => (
                          <div key={index} className="bg-gray-50 p-4 rounded-md">
                            <div className="font-medium mb-1">{achievement.name}</div>
                            <div className="text-sm text-gray-500 mb-2">
                              {new Date(achievement.date).toLocaleDateString()}
                            </div>
                            <p className="text-sm">{achievement.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium mb-2">Select a journey</h3>
                <p className="text-gray-500">
                  Choose a journey from the list to view its details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Journey Dialog */}
      <Dialog open={isNewJourneyDialogOpen} onOpenChange={setIsNewJourneyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Spiritual Journey</DialogTitle>
            <DialogDescription>
              Define your spiritual path and track your progress over time.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newJourneyForm}>
            <form onSubmit={newJourneyForm.handleSubmit(onSubmitNewJourney)} className="space-y-4">
              <FormField
                control={newJourneyForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Journey Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Path to Inner Peace" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newJourneyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose of your spiritual journey..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newJourneyForm.control}
                name="goals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spiritual Goals</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your goals separated by commas..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Enter multiple goals separated by commas (e.g., "Find inner peace, Connect with ancestors")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewJourneyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createJourneyMutation.isPending}
                >
                  {createJourneyMutation.isPending ? 'Creating...' : 'Create Journey'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Journey Item Dialog */}
      <Dialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Journey Milestone</DialogTitle>
            <DialogDescription>
              Add a new milestone to track in your spiritual journey.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newJourneyItemForm}>
            <form onSubmit={newJourneyItemForm.handleSubmit(onSubmitNewJourneyItem)} className="space-y-4">
              <FormField
                control={newJourneyItemForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Complete Satyanarayan Puja" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newJourneyItemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What do you hope to achieve with this milestone?" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newJourneyItemForm.control}
                name="pujaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Puja (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="Enter puja ID if related to a specific puja" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      If this milestone is tied to a specific puja, enter its ID
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newJourneyItemForm.control}
                name="sequence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence Number</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))} 
                      />
                    </FormControl>
                    <FormDescription>
                      The order this milestone should appear in your journey
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewItemDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createJourneyItemMutation.isPending}
                >
                  {createJourneyItemMutation.isPending ? 'Adding...' : 'Add Milestone'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reflection Dialog */}
      <Dialog open={isReflectionDialogOpen} onOpenChange={setIsReflectionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reflect on Your Journey</DialogTitle>
            <DialogDescription>
              Reflect on what you've learned from this milestone before marking it complete.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...reflectionForm}>
            <form onSubmit={reflectionForm.handleSubmit(onSubmitReflection)} className="space-y-4">
              <FormField
                control={reflectionForm.control}
                name="reflection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Reflection</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What did you learn from this experience? How has it changed you?" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Your reflection helps deepen your spiritual growth and will be saved with this milestone.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsReflectionDialogOpen(false);
                    setSelectedItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={markItemCompleteMutation.isPending}
                >
                  {markItemCompleteMutation.isPending ? 'Saving...' : 'Complete Milestone'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpiritualJourney;