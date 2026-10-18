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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  HelpCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function FAQManagementTab() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      id: 1,
      question: 'How do I book a puja?',
      answer: 'You can book a puja by selecting the service type, choosing a Guruji, picking your preferred date and time, and completing the payment process.',
      category: 'Booking',
      order: 1,
      isActive: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
    {
      id: 2,
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, UPI, net banking, and digital wallets.',
      category: 'Payment',
      order: 2,
      isActive: true,
      createdAt: '2023-01-02',
      updatedAt: '2023-01-02'
    },
    {
      id: 3,
      question: 'Can I reschedule my booking?',
      answer: 'Yes, you can reschedule your booking up to 24 hours before the scheduled time. There are no additional charges for rescheduling.',
      category: 'Booking',
      order: 3,
      isActive: true,
      createdAt: '2023-01-03',
      updatedAt: '2023-01-03'
    },
    {
      id: 4,
      question: 'Are all Gurujis verified?',
      answer: 'Yes, all our Gurujis are thoroughly verified with proper credentials, experience certificates, and background checks.',
      category: 'General',
      order: 4,
      isActive: true,
      createdAt: '2023-01-04',
      updatedAt: '2023-01-04'
    }
  ]);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: ''
  });

  const categories = ['General', 'Booking', 'Payment', 'Services', 'Technical'];

  const handleAddFAQ = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const newFAQ: FAQ = {
        id: Date.now(),
        question: formData.question,
        answer: formData.answer,
        category: formData.category,
        order: faqs.length + 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setFaqs(prev => [...prev, newFAQ]);
      setFormData({ question: '', answer: '', category: '' });
      setIsAddDialogOpen(false);
      setIsLoading(false);
      
      toast({
        title: 'Success',
        description: 'FAQ created successfully',
      });
    }, 1000);
  };

  const handleEditFAQ = () => {
    if (!selectedFAQ) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setFaqs(prev => prev.map(faq => 
        faq.id === selectedFAQ.id 
          ? { 
              ...faq, 
              question: formData.question, 
              answer: formData.answer, 
              category: formData.category,
              updatedAt: new Date().toISOString() 
            }
          : faq
      ));
      
      setFormData({ question: '', answer: '', category: '' });
      setSelectedFAQ(null);
      setIsEditDialogOpen(false);
      setIsLoading(false);
      
      toast({
        title: 'Success',
        description: 'FAQ updated successfully',
      });
    }, 1000);
  };

  const handleDeleteFAQ = (id: number) => {
    setFaqs(prev => prev.filter(faq => faq.id !== id));
    toast({
      title: 'Success',
      description: 'FAQ deleted successfully',
    });
  };

  const handleToggleFAQ = (id: number) => {
    setFaqs(prev => prev.map(faq => 
      faq.id === id 
        ? { ...faq, isActive: !faq.isActive }
        : faq
    ));
  };

  const handleMoveUp = (id: number) => {
    const index = faqs.findIndex(faq => faq.id === id);
    if (index > 0) {
      const newFaqs = [...faqs];
      [newFaqs[index], newFaqs[index - 1]] = [newFaqs[index - 1], newFaqs[index]];
      setFaqs(newFaqs);
    }
  };

  const handleMoveDown = (id: number) => {
    const index = faqs.findIndex(faq => faq.id === id);
    if (index < faqs.length - 1) {
      const newFaqs = [...faqs];
      [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];
      setFaqs(newFaqs);
    }
  };

  const openEditDialog = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setFormData({ 
      question: faq.question, 
      answer: faq.answer, 
      category: faq.category 
    });
    setIsEditDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'General': 'bg-blue-100 text-blue-800',
      'Booking': 'bg-green-100 text-green-800',
      'Payment': 'bg-yellow-100 text-yellow-800',
      'Services': 'bg-purple-100 text-purple-800',
      'Technical': 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="flex flex-col space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              FAQ Management
            </CardTitle>
            <CardDescription>
              Manage frequently asked questions displayed to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Frequently Asked Questions</h3>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
              
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqs.map((faq, index) => (
                      <TableRow key={faq.id}>
                        <TableCell className="font-medium max-w-xs">
                          <div className="truncate">{faq.question}</div>
                          <div className="text-sm text-muted-foreground truncate mt-1">
                            {faq.answer}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(faq.category)}>
                            {faq.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={faq.isActive ? 'default' : 'secondary'}>
                            {faq.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <span>{index + 1}</span>
                            <div className="flex flex-col">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMoveUp(faq.id)}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMoveDown(faq.id)}
                                disabled={index === faqs.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditDialog(faq)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleToggleFAQ(faq.id)}
                            >
                              {faq.isActive ? 'Hide' : 'Show'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteFAQ(faq.id)}
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
          </CardContent>
        </Card>
      </div>

      {/* Add FAQ Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New FAQ</DialogTitle>
            <DialogDescription>
              Create a new frequently asked question for customers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="faq-category">Category</Label>
              <select
                id="faq-category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-question">Question</Label>
              <Input
                id="faq-question"
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="e.g. How do I book a puja?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea
                id="faq-answer"
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="Enter the detailed answer..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddFAQ} 
              disabled={isLoading || !formData.question || !formData.answer || !formData.category}
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit FAQ Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>
              Update the frequently asked question
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-faq-category">Category</Label>
              <select
                id="edit-faq-category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-faq-question">Question</Label>
              <Input
                id="edit-faq-question"
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="e.g. How do I book a puja?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-faq-answer">Answer</Label>
              <Textarea
                id="edit-faq-answer"
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="Enter the detailed answer..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditFAQ} 
              disabled={isLoading || !formData.question || !formData.answer || !formData.category}
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}