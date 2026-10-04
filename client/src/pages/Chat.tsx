import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useIsMobile } from '@/hooks/use-mobile';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, PhoneCall, Video, Send, MoreVertical, ChevronLeft } from 'lucide-react';

// Mock data for Gurujis
const gurujis = [
  {
    id: 1,
    name: 'Pandit Ramesh Shastri',
    speciality: 'Vastu Shastra',
    image: '',
    status: 'online',
    lastMessage: 'I can guide you through the Graha Pravesh ceremony',
    time: '10:24 AM'
  },
  {
    id: 2,
    name: 'Acharya Vishal Sharma',
    speciality: 'Vedic Astrology',
    image: '',
    status: 'offline',
    lastMessage: 'Your rashi shows positive alignment, we can discuss more',
    time: 'Yesterday'
  },
  {
    id: 3,
    name: 'Guruji Pankaj Mishra',
    speciality: 'Jyotish',
    image: '',
    status: 'online',
    lastMessage: 'The muhurat for your ceremony will be on Monday',
    time: '2 days ago'
  }
];

// Mock chat messages
const chatMessages = [
  {
    id: 1,
    sender: 'user',
    text: 'Namaste Guruji, I need guidance on performing a Griha Pravesh puja in my new home.',
    time: '10:10 AM'
  },
  {
    id: 2,
    sender: 'guruji',
    text: 'Namaste! Congratulations on your new home. Griha Pravesh is indeed a very important ceremony. When are you planning to move in?',
    time: '10:15 AM'
  },
  {
    id: 3,
    sender: 'user',
    text: 'We are planning to move next month, around the 15th. Is that an auspicious date?',
    time: '10:18 AM'
  },
  {
    id: 4,
    sender: 'guruji',
    text: 'Let me check the panchang for that date. The 15th falls on a Wednesday, which is generally good. However, we need to check for any specific doshas on that day.',
    time: '10:20 AM'
  },
  {
    id: 5,
    sender: 'guruji',
    text: 'I can guide you through the Graha Pravesh ceremony. Would you like me to perform it, or are you looking for guidance to perform it yourself?',
    time: '10:24 AM'
  }
];

// Mobile Chat component
function MobileChat() {
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  
  const activeGuruji = gurujis.find(g => g.id === activeChatId);
  
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In a real app, this would send the message to the API
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };
  
  if (activeChatId) {
    return (
      <div className="flex flex-col h-screen">
        {/* Chat header */}
        <div className="bg-white border-b p-3 flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActiveChatId(null)}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Avatar className="h-9 w-9">
            <AvatarFallback>{activeGuruji?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-grow">
            <h2 className="text-sm font-medium">{activeGuruji?.name}</h2>
            <p className="text-xs text-green-600">{activeGuruji?.status === 'online' ? 'Online' : 'Offline'}</p>
          </div>
          
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-600">
              <PhoneCall className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-600">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-600">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Chat messages */}
        <ScrollArea className="flex-grow p-4 bg-neutral-50">
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.sender === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-white border'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-primary-100' : 'text-neutral-500'
                  }`}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Message input */}
        <div className="p-3 bg-white border-t flex items-center space-x-2">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pb-14">
      <div className="bg-primary text-white p-4">
        <h1 className="text-xl font-bold">Consultations</h1>
        <p className="text-sm text-primary-100">Chat with Gurujis for spiritual guidance</p>
      </div>
      
      <Tabs defaultValue="chats" className="p-4" onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="chats" className="flex-1">Recent Chats</TabsTrigger>
          <TabsTrigger value="gurujis" className="flex-1">Find Gurujis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chats" className="space-y-4">
          {gurujis.length > 0 ? (
            gurujis.map((guruji) => (
              <div 
                key={guruji.id}
                className="flex items-center p-3 bg-white rounded-lg border cursor-pointer hover:bg-neutral-50"
                onClick={() => setActiveChatId(guruji.id)}
              >
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarFallback>{guruji.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-grow">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-sm">{guruji.name}</h3>
                    <span className="text-xs text-neutral-500">{guruji.time}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{guruji.speciality}</p>
                  <p className="text-xs truncate mt-1">{guruji.lastMessage}</p>
                </div>
                
                <Badge 
                  variant="outline" 
                  className={`ml-2 h-2 w-2 p-0 rounded-full ${
                    guruji.status === 'online' ? 'bg-green-500' : 'bg-neutral-300'
                  }`} 
                />
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-neutral-500">No recent conversations</p>
              <Button className="mt-4" onClick={() => setActiveTab('gurujis')}>
                Find a Guruji to chat
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="gurujis" className="space-y-4">
          <Input placeholder="Search by name, speciality, or location..." className="mb-4" />
          
          {gurujis.map((guruji) => (
            <div 
              key={guruji.id}
              className="flex items-center p-3 bg-white rounded-lg border cursor-pointer hover:bg-neutral-50"
              onClick={() => setActiveChatId(guruji.id)}
            >
              <Avatar className="h-12 w-12 mr-3">
                <AvatarFallback>{guruji.name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-grow">
                <div className="flex justify-between">
                  <h3 className="font-medium text-sm">{guruji.name}</h3>
                  <Badge 
                    variant="outline" 
                    className={`ml-2 ${
                      guruji.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-neutral-100'
                    }`}
                  >
                    {guruji.status === 'online' ? 'Available' : 'Offline'}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{guruji.speciality}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Desktop Chat component
function DesktopChat() {
  const [activeChatId, setActiveChatId] = useState<number | null>(1); // Default to first chat
  const [newMessage, setNewMessage] = useState('');
  
  const activeGuruji = gurujis.find(g => g.id === activeChatId);
  
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In a real app, this would send the message to the API
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-3 gap-6 bg-white border rounded-lg overflow-hidden shadow-sm" style={{ height: '75vh' }}>
        {/* Left sidebar - chat list */}
        <div className="col-span-1 border-r">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">Consultations</h2>
            <p className="text-sm text-neutral-500">Chat with Gurujis for guidance</p>
          </div>
          
          <ScrollArea className="h-[calc(75vh-80px)]">
            <div className="p-2">
              <Input placeholder="Search conversations..." className="mb-4" />
              
              {gurujis.map((guruji) => (
                <div 
                  key={guruji.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 ${
                    activeChatId === guruji.id 
                      ? 'bg-primary/10' 
                      : 'hover:bg-neutral-50'
                  }`}
                  onClick={() => setActiveChatId(guruji.id)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>{guruji.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-grow">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-sm">{guruji.name}</h3>
                      <span className="text-xs text-neutral-500">{guruji.time}</span>
                    </div>
                    <p className="text-xs truncate">{guruji.lastMessage}</p>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className={`ml-2 h-2 w-2 p-0 rounded-full ${
                      guruji.status === 'online' ? 'bg-green-500' : 'bg-neutral-300'
                    }`} 
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Main chat area */}
        <div className="col-span-2 flex flex-col">
          {activeChatId ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>{activeGuruji?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h2 className="font-medium">{activeGuruji?.name}</h2>
                    <p className="text-xs text-neutral-500">{activeGuruji?.speciality}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm">
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                </div>
              </div>
              
              {/* Chat messages */}
              <ScrollArea className="flex-grow p-4 bg-neutral-50">
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.sender === 'guruji' && (
                        <Avatar className="h-8 w-8 mr-2 mt-1 self-end">
                          <AvatarFallback>{activeGuruji?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div 
                        className={`rounded-lg p-3 max-w-[70%] ${
                          message.sender === 'user' 
                            ? 'bg-primary text-white' 
                            : 'bg-white border'
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-primary-100' : 'text-neutral-500'
                        }`}>
                          {message.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Message input */}
              <div className="p-3 bg-white border-t flex items-center space-x-2">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-medium">No Chat Selected</h3>
                <p className="text-neutral-500 mt-2">Choose a conversation from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const isMobile = useIsMobile();
  
  return (
    <>
      <Helmet>
        <title>Chat with Gurujis | Sanatan Guruji</title>
        <meta name="description" content="Get guidance from experienced Gurujis through chat, audio, or video consultations" />
        {isMobile && <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />}
      </Helmet>
      
      {isMobile ? (
        <MobileLayout>
          <MobileChat />
        </MobileLayout>
      ) : (
        <div className="min-h-screen bg-neutral-50 flex flex-col">
          <Header />
          <main className="flex-grow">
            <DesktopChat />
          </main>
          <Footer />
        </div>
      )}
    </>
  );
}