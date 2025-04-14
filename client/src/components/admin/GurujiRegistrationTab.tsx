
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Eye } from 'lucide-react';

interface GurujiRegistration {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  aadharNumber: string;
  panNumber: string;
  specialization: string[];
  experience: number;
  address: string;
  certificates: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function GurujiRegistrationTab() {
  const [selectedGuruji, setSelectedGuruji] = useState<GurujiRegistration | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Mock data - replace with actual API call
  const registrations: GurujiRegistration[] = [
    {
      id: 1,
      firstName: 'Ramesh',
      lastName: 'Sharma',
      email: 'ramesh.sharma@example.com',
      mobile: '9876543210',
      aadharNumber: 'XXXX-XXXX-XXXX',
      panNumber: 'ABCDE1234F',
      specialization: ['Satyanarayan Puja', 'Griha Pravesh'],
      experience: 15,
      address: 'Mumbai, Maharashtra',
      certificates: ['vedic_studies.pdf', 'puja_certification.pdf'],
      status: 'pending',
      createdAt: '2024-03-20'
    }
  ];

  const handleViewDetails = (guruji: GurujiRegistration) => {
    setSelectedGuruji(guruji);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guruji Registration Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>{reg.firstName} {reg.lastName}</TableCell>
                  <TableCell>
                    {reg.email}<br/>
                    {reg.mobile}
                  </TableCell>
                  <TableCell>{reg.specialization.join(', ')}</TableCell>
                  <TableCell>{reg.experience} years</TableCell>
                  <TableCell>{getStatusBadge(reg.status)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewDetails(reg)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guruji Registration Details</DialogTitle>
          </DialogHeader>
          
          {selectedGuruji && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-neutral-500">Personal Information</h4>
                  <div className="mt-2 space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedGuruji.firstName} {selectedGuruji.lastName}</p>
                    <p><span className="font-medium">Email:</span> {selectedGuruji.email}</p>
                    <p><span className="font-medium">Mobile:</span> {selectedGuruji.mobile}</p>
                    <p><span className="font-medium">Address:</span> {selectedGuruji.address}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-neutral-500">Professional Information</h4>
                  <div className="mt-2 space-y-2">
                    <p><span className="font-medium">Experience:</span> {selectedGuruji.experience} years</p>
                    <p><span className="font-medium">Specialization:</span> {selectedGuruji.specialization.join(', ')}</p>
                    <p><span className="font-medium">Aadhar:</span> {selectedGuruji.aadharNumber}</p>
                    <p><span className="font-medium">PAN:</span> {selectedGuruji.panNumber}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-neutral-500">Certificates</h4>
                <div className="mt-2">
                  {selectedGuruji.certificates.map((cert, i) => (
                    <Badge key={i} variant="secondary" className="mr-2 mb-2">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button variant="destructive">
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button variant="default">
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
