'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, MessageSquare, Tag, CheckCircle, Ban, PlayCircle, Trash2, Megaphone, Smartphone, Download } from 'lucide-react';
import Image from 'next/image';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';
import html2canvas from 'html2canvas';

export function ShopManagement({ users = [], products = [], loading }: { users: any[], products?: any[], loading: boolean }) {
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [adTab, setAdTab] = useState('calendar');
  const [occasion, setOccasion] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('none');
  const [productOffer, setProductOffer] = useState('');
  const [customText, setCustomText] = useState('');

  // Poster state
  const posterRef = useRef<HTMLDivElement>(null);
  const [posterTheme, setPosterTheme] = useState('creative-oreo');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

  const handleStatusChange = async (userId: string, newStatus: 'approved' | 'suspended', currentStatus: string) => {
    if (newStatus === 'suspended' || currentStatus === 'suspended') {
      const actionName = newStatus === 'suspended' ? 'stop' : 'resume';
      const password = window.prompt(`Please enter the admin password to ${actionName} this shop:`);
      if (password !== '7204344330') {
        if (password !== null) {
          toast({ variant: 'destructive', title: 'Incorrect password', description: 'Action denied.' });
        }
        return;
      }
    }

    setApprovingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      toast({ title: `Shop ${newStatus} successfully!` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: `Error updating shop`, description: e.message });
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const password = window.prompt('Please enter the admin password to delete this shop:');
    if (password !== '151571') {
      if (password !== null) {
        toast({ variant: 'destructive', title: 'Incorrect password', description: 'You cannot delete this shop.' });
      }
      return;
    }

    if (!window.confirm('Are you sure you want to delete this shop?')) return;
    setApprovingId(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast({ title: 'Shop deleted successfully!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error deleting shop', description: e.message });
    } finally {
      setApprovingId(null);
    }
  };

  const uniqueLocations = useMemo(() => {
    const locations = users
      .filter((user) => user.role === 'shop' && user.location)
      .map((user) => user.location);
    return Array.from(new Set(locations)) as string[];
  }, [users]);

  const shopUsers = users.filter(user => {
    if (user.role !== 'shop') return false;
    if (locationFilter && locationFilter !== 'all') {
      return user.location?.toLowerCase() === locationFilter.toLowerCase();
    }
    return true;
  }).sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    const nameA = a.shopName || '';
    const nameB = b.shopName || '';
    return nameA.localeCompare(nameB);
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(shopUsers.map(u => u.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const selectedUsers = shopUsers.filter(u => selectedUserIds.has(u.id));
  const selectedPhoneNumbers = selectedUsers.filter(u => u.phoneNumber).map(u => u.phoneNumber).join(',');

  const generateAdText = () => {
    if (adTab === 'calendar') {
      return `🌟 Special Greetings from GAJANAN ENTERPRISES, GHATAPRABHA! 🌟\n\nWishing you a very Happy ${occasion || '[Occasion]'}!\n\nCelebrate with our refreshing products. Place your order directly in the app! 📱📦🚚`;
    } else if (adTab === 'product') {
      const product = products?.find(p => p.id === selectedProductId);
      const productName = product ? product.name : '[Product Name]';
      if (product) {
        const actualRate = product.rate ? product.rate : '';
        const offerStr = productOffer ? `\nOffer Rate: ₹${productOffer}` : '';
        const rateStr = actualRate ? `\nActual Rate: ₹${actualRate}` : '';
        return `🌟 Special Offer from GAJANAN ENTERPRISES GHATAPRABHA! 🌟\n\nGrab ${productName} today!${rateStr}${offerStr}\n\nPlace your order directly in the app! 📱📦🚚`;
      }
      return `🌟 Special Offer from GAJANAN ENTERPRISES GHATAPRABHA! 🌟\n\nGrab ${productName} today!\n\nPlace your order directly in the app! 📱📦🚚`;
    } else {
      return `🌟 Special Offer from GAJANAN ENTERPRISES GHATAPRABHA! 🌟\n\n${customText}\n\nPlace your order directly in the app! 📱📦🚚`;
    }
  };

  const generatedText = generateAdText();
  const selectedProductDetails = products?.find(p => p.id === selectedProductId);

  const handleSendWhatsApp = () => {
    if (selectedUsers.length === 0) {
      toast({ variant: 'destructive', title: 'No users selected' });
      return;
    }
    
    if (selectedUsers.length === 1 && selectedUsers[0].phoneNumber) {
      const phone = selectedUsers[0].phoneNumber.replace(/\D/g, '');
      window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(generatedText)}`, '_blank');
      setIsOfferDialogOpen(false);
      return;
    }

    toast({ 
      title: 'WhatsApp Links Generated', 
      description: 'Since you selected multiple shops, please click the WhatsApp buttons next to each selected shop in the list below to send them the message individually. Or you can copy the message and use a Broadcast list.' 
    });
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    setIsGeneratingPoster(true);
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true, allowTaint: true });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ad-poster-${Date.now()}.png`;
      link.click();
      toast({ title: 'Poster downloaded successfully!' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to generate poster' });
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const posterThemes = {
    'creative-oreo': 'bg-gradient-to-b from-[#0052a3] via-[#1070e5] to-[#40a3ff] text-white overflow-hidden',
    'gradient-blue': 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white',
    'gradient-purple': 'bg-gradient-to-br from-purple-600 to-pink-500 text-white',
    'gradient-red': 'bg-gradient-to-br from-red-600 to-orange-500 text-white',
    'dark-modern': 'bg-gray-900 text-white border-2 border-gray-700',
    'festive': 'bg-yellow-100 text-red-700 border-4 border-red-500 bg-[url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fbbf24\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")]',
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle>Shop Management</CardTitle>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          
          <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" title="Open Ad Creator" disabled={selectedUserIds.size === 0}>
                <Megaphone className="h-4 w-4 mr-2" />
                Ad Creator ({selectedUserIds.size})
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Ad Campaign</DialogTitle>
              </DialogHeader>
              
              <Tabs value={adTab} onValueChange={setAdTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="product">Product</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
                
                <div className="py-4 space-y-4">
                  <TabsContent value="calendar" className="space-y-2 mt-0">
                    <Label htmlFor="occasion">Occasion / Festival</Label>
                    <Input 
                      id="occasion" 
                      placeholder="e.g. Diwali, New Year, Eid" 
                      value={occasion} 
                      onChange={(e) => setOccasion(e.target.value)} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="product" className="space-y-2 mt-0">
                    <Label>Select Product</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 overflow-y-auto">
                        <SelectItem value="none">-- Select a Product --</SelectItem>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2">
                      <Label htmlFor="productOffer">Offer Rate (Optional)</Label>
                      <Input 
                        id="productOffer" 
                        placeholder="e.g. 90" 
                        value={productOffer} 
                        onChange={(e) => setProductOffer(e.target.value)} 
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="custom" className="space-y-2 mt-0">
                    <Label>Custom Message</Label>
                    <textarea 
                      className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background"
                      placeholder="Type your custom offer details here..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                    />
                  </TabsContent>

                  <div className="mt-6 border-t pt-4">
                    <Label className="text-muted-foreground flex items-center justify-between mb-2">
                      <span className="font-semibold text-foreground">Poster Preview</span>
                      <Select value={posterTheme} onValueChange={setPosterTheme}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="creative-oreo">Creative Oreo</SelectItem>
                          <SelectItem value="gradient-blue">Blue Gradient</SelectItem>
                          <SelectItem value="gradient-purple">Purple Gradient</SelectItem>
                          <SelectItem value="gradient-red">Red Gradient</SelectItem>
                          <SelectItem value="dark-modern">Dark Modern</SelectItem>
                          <SelectItem value="festive">Festive</SelectItem>
                        </SelectContent>
                      </Select>
                    </Label>
                    
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-gray-100 p-4 rounded-md w-full overflow-hidden flex justify-center">
                        <div 
                          ref={posterRef} 
                          className={`w-[300px] min-h-[300px] h-auto flex flex-col justify-between gap-4 p-6 rounded-lg shadow-xl relative ${posterThemes[posterTheme as keyof typeof posterThemes]}`}
                        >
                          <div className="text-center font-bold text-[15px] leading-tight uppercase tracking-widest mb-2 opacity-90">
                            GAJANAN ENTERPRISES GHATAPRABHA
                          </div>
                          
                          <div className="flex-1 flex flex-col items-center justify-center text-center">
                            {adTab === 'product' && selectedProductDetails ? (
                              <>
                                {/* Floating Background Elements for Creative Theme */}
                                {(posterTheme === 'creative-oreo' || posterTheme === 'gradient-blue') && (
                                  <>
                                    <div className="absolute top-12 left-[-20px] w-16 h-8 bg-white/70 rounded-full blur-[2px] opacity-70 z-0"></div>
                                    <div className="absolute top-8 left-[-5px] w-10 h-10 bg-white/70 rounded-full blur-[2px] opacity-70 z-0"></div>
                                    <div className="absolute bottom-40 right-[-10px] w-20 h-10 bg-white/60 rounded-full blur-[2px] opacity-80 z-0"></div>
                                    <div className="absolute bottom-44 right-5 w-12 h-12 bg-white/60 rounded-full blur-[2px] opacity-80 z-0"></div>
                                  </>
                                )}

                                <div className="z-10 mb-4 mt-2 text-center transform -rotate-2 w-full">
                                  <div 
                                    className={`text-base sm:text-lg font-black tracking-widest uppercase mb-2 ${posterTheme === 'festive' ? 'text-red-700' : 'text-white'}`}
                                    style={{
                                      textShadow: posterTheme === 'festive' 
                                        ? '1px 1px 0 #fca5a5, 2px 2px 0 #f87171, 3px 3px 4px rgba(220,38,38,0.25)'
                                        : '1px 1px 0 #e2e8f0, 2px 2px 0 #cbd5e1, 3px 3px 4px rgba(0,0,0,0.25)'
                                    }}
                                  >
                                    THE BRAND OF TRUST
                                  </div>
                                  <div className={`text-[2.5rem] font-black uppercase tracking-tighter leading-none whitespace-pre-wrap break-words px-2 ${posterTheme === 'festive' ? 'text-red-950 drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)]' : 'text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]'}`}>
                                    {selectedProductDetails.name}
                                  </div>
                                </div>

                                {selectedProductDetails.imageUrl && (
                                  <div className={`w-48 h-48 relative mb-4 mt-2 mx-auto flex items-center justify-center z-20 rounded-3xl p-4 backdrop-blur-md ${posterTheme === 'festive' ? 'bg-white/40 border-[3px] border-red-300 shadow-[0_8px_30px_rgba(220,38,38,0.2)]' : 'bg-white/20 border-[3px] border-white/60 shadow-[0_8px_30px_rgba(255,255,255,0.3)]'}`}>
                                    <img 
                                      src={selectedProductDetails.imageUrl} 
                                      alt={selectedProductDetails.name} 
                                      className="w-full h-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-300" 
                                      crossOrigin="anonymous" 
                                    />
                                  </div>
                                )}
                                
                                <div className="z-10 flex flex-col items-center mt-2 w-full">
                                  {selectedProductDetails.rate != null && (
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                      <div className={`text-xl font-black px-4 py-1 rounded-full shadow-sm border ${posterTheme === 'festive' ? 'bg-white/60 border-red-200 text-red-950' : 'bg-white/30 border-white/20'} ${productOffer ? (posterTheme === 'festive' ? 'line-through text-red-900/60 text-lg' : 'line-through text-white/70 text-lg') : ''}`}>
                                        ₹{selectedProductDetails.rate}
                                      </div>
                                      {productOffer && (
                                        <div className="text-3xl font-black bg-[#ff3b3b] text-yellow-300 px-5 py-1 rounded-full shadow-lg border-2 border-yellow-300 transform rotate-2">
                                          ₹{productOffer}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {selectedProductDetails.rate == null && productOffer && (
                                    <div className="text-3xl font-black bg-[#ff3b3b] text-yellow-300 px-5 py-1 rounded-full mb-2 shadow-lg border-2 border-yellow-300 transform rotate-2">
                                      ₹{productOffer}
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-2xl font-bold px-2 leading-snug drop-shadow-sm whitespace-pre-wrap break-words w-full">
                                {adTab === 'calendar' ? `Happy ${occasion || 'Celebration'}!` : (customText || 'Special Offer!')}
                              </div>
                            )}
                          </div>

                          <div className="text-center text-xs opacity-90 mt-3 font-semibold bg-black/10 py-1 rounded">
                            Order directly in the app! 📱📦
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full max-w-[300px]" 
                        onClick={handleDownloadPoster}
                        disabled={isGeneratingPoster}
                      >
                        {isGeneratingPoster ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                        Download Image Poster
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <Label className="text-muted-foreground font-semibold text-foreground mb-2 block">Text Message Preview</Label>
                    <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap mt-2">
                      {generatedText}
                    </div>
                  </div>
                </div>
              </Tabs>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsOfferDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                
                <a href={`sms:${selectedPhoneNumbers}?body=${encodeURIComponent(generatedText)}`} className="w-full sm:w-auto">
                  <Button className="w-full" disabled={!selectedPhoneNumbers}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                </a>

                <Button onClick={handleSendWhatsApp} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" disabled={!selectedPhoneNumbers}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    checked={shopUsers.length > 0 && selectedUserIds.size === shopUsers.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    title="Select All"
                  />
                </TableHead>
                <TableHead>Avatar</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopUsers.map((user) => (
                <TableRow key={user.id} className={selectedUserIds.has(user.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                      checked={selectedUserIds.has(user.id)}
                      onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        {user.imageUrl ? (
                            <Image src={user.imageUrl} alt={user.shopName || 'Shop avatar'} layout="fill" objectFit="cover" />
                        ) : (
                            <UserIcon className="h-6 w-6 text-gray-400" />
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{user.shopName || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{user.profileName || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{user.phoneNumber || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>{user.location || 'N/A'}</TableCell>
                  <TableCell>
                    {user.status === 'pending' ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    ) : user.status === 'suspended' ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                        Approved
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-2">
                    {user.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleStatusChange(user.id, 'approved', user.status)}
                        disabled={approvingId === user.id}
                      >
                        {approvingId === user.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Approve
                      </Button>
                    )}
                    {user.status === 'approved' && (
                       <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleStatusChange(user.id, 'suspended', user.status)}
                        disabled={approvingId === user.id}
                      >
                        {approvingId === user.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                        Stop
                      </Button>
                    )}
                    {user.status === 'suspended' && (
                       <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleStatusChange(user.id, 'approved', user.status)}
                        disabled={approvingId === user.id}
                      >
                        {approvingId === user.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                        Resume
                      </Button>
                    )}
                    
                    {selectedUserIds.size > 1 && selectedUserIds.has(user.id) && user.phoneNumber && (
                      <a href={`https://wa.me/91${user.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(generatedText)}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" title="Send WhatsApp Message">
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={approvingId === user.id}
                      title="Delete Shop"
                    >
                      {approvingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
