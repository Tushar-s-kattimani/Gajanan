'use client';

import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Trash2, Plus, Minus, ShoppingBasket, Image as ImageIcon, Megaphone } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import placeholderImageData from '@/lib/placeholder-images.json';


function getCleanImageUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/^"|"$/g, '').replace(/\\/g, '/');
  
  if (clean.startsWith('public/')) {
    clean = clean.substring(6); // remove "public" so it starts with "/"
  } else {
    const publicIndex = clean.toLowerCase().indexOf('/public/');
    if (publicIndex !== -1) {
      clean = clean.substring(publicIndex + 7);
    }
  }
  
  if (clean && !clean.startsWith('/') && !clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:')) {
    clean = '/' + clean;
  }
  
  return clean;
}

export function NewOrder({ products: initialProducts = [], loading }: { products: any[], loading: boolean }) {
  const { cart, addToCart, updateQuantity, clearCart } = useCart();
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  
  const cartTotal = cart.reduce((total, item) => total + ((item.rate || 0) * item.quantity), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const products = useMemo(() => {
    if (!initialProducts) return [];
    return initialProducts.map((p) => {
      const cleaned = getCleanImageUrl(p.imageUrl);
      return {
        ...p,
        imageUrl: cleaned || '/default_bottle.png',
        "data-ai-hint": "soda bottle",
      };
    });
  }, [initialProducts]);

  const handleQuantityChange = (productId: string, value: string | number) => {
    const newQuantity = Math.max(1, Number(value));
    setQuantities(prev => ({ ...prev, [productId]: newQuantity }));
  };
  
  const handleAddToCart = (product: any) => {
    const quantityToAdd = quantities[product.id] || 1;
     if (isNaN(quantityToAdd) || quantityToAdd < 1) {
        toast({ variant: 'destructive', title: 'Invalid Quantity', description: 'Please enter a valid quantity.' });
        return;
    }
    if (quantityToAdd > product.stock) {
        toast({ variant: 'destructive', title: 'Insufficient Stock', description: `Only ${product.stock} units available.` });
        return;
    }
    
    addToCart(product, quantityToAdd);
    // Reset quantity to 1 after adding
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };
  
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="shadow-none border-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-bold tracking-tight">Available Products</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-1 sm:gap-4 bg-gray-100 p-1 sm:bg-transparent sm:p-0">
                {products.map((product) => {
                   return (
                    <Card key={product.id} className={`flex flex-col bg-white overflow-hidden transition-shadow duration-300 border border-gray-200/60 sm:border-gray-200 rounded-none sm:rounded-sm ${
                        product.isAd
                          ? 'ad-card border-amber-200'
                          : 'hover:shadow-[0_3px_10px_0_rgba(0,0,0,0.1)]'
                      }`}>
                      {product.isAd && (
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center gap-1 text-white text-[10px] font-bold py-1 px-2 uppercase tracking-wide">
                          <span>Ad</span>
                        </div>
                      )}
                       <div className="relative h-36 sm:h-52 w-full flex items-center justify-center p-4 bg-white group cursor-pointer">
                            {product.imageUrl && !product.imageUrl.startsWith('file:///') && !product.imageUrl.match(/^[a-zA-Z]:[/]/) ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                    data-ai-hint={product['data-ai-hint']}
                                />
                            ) : (
                                <ImageIcon className="h-10 w-10 sm:h-16 sm:w-16 text-gray-200" />
                            )}
                            {product.isAd && (
                              <div className="absolute bottom-2 left-2 bg-white/90 text-orange-600 px-2 py-0.5 rounded text-[9px] font-bold border border-orange-200">
                                PROMOTED
                              </div>
                            )}
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col flex-grow bg-white border-t border-gray-50 sm:border-none">
                          <h3 className="font-medium text-sm sm:text-base text-gray-800 line-clamp-2 hover:text-[#2874f0] cursor-pointer leading-tight">{product.name}</h3>
                          <p className="text-xs text-gray-500 mt-1.5">{product.size}</p>
                          {product.rate != null && (
                            <div className="mt-2 flex items-center flex-wrap gap-1.5">
                              <span className="font-bold text-base sm:text-lg text-gray-900">
                                ₹{Number(product.rate).toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-gray-500 line-through">
                                ₹{Math.round(Number(product.rate) * 1.2).toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs font-bold text-[#388e3c]">
                                20% off
                              </span>
                            </div>
                          )}
                          <div className="flex-grow"></div>
                          <div className="mt-2 sm:mt-3 flex items-center justify-between">
                             <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/batman-returns/images/fk-default-image-75ff340b.png?q=90" alt="assured" className="h-4 hidden sm:block opacity-0" />
                             {/* Using invisible assured logo placeholder to align things or just simple text */}
                             {product.stock <= 5 && product.stock > 0 ? (
                                <span className="text-[10px] sm:text-xs font-medium text-red-500">Only {product.stock} left</span>
                             ) : product.stock === 0 ? (
                                <span className="text-[10px] sm:text-xs font-medium text-red-500">Out of Stock</span>
                             ) : (
                                <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/batman-returns/images/fk-default-image-75ff340b.png?q=90" alt="assured" className="h-3 sm:h-4 opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
                             )}
                          </div>
                      </div>
                      <CardFooter className="flex-col items-stretch space-y-2 p-3 sm:p-4 pt-0 sm:pt-0 bg-white">
                        {product.stock > 0 ? (
                            <div className="flex flex-col gap-2 w-full mt-2">
                              <div className="flex w-full items-center justify-center gap-2 mb-1">
                                <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border-gray-300 text-gray-700 bg-gray-50 shrink-0" onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) - 1)}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={quantities[product.id] || 1}
                                  onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                  className="w-10 sm:w-12 h-6 sm:h-7 text-center font-medium text-sm border border-gray-200 px-1 rounded-sm"
                                />
                                <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border-gray-300 text-gray-700 bg-gray-50 shrink-0" onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) + 1)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button size="sm" onClick={() => handleAddToCart(product)} className="w-full h-8 sm:h-9 text-xs sm:text-sm bg-[#2874f0] hover:bg-blue-600 text-white font-medium rounded-sm shadow-sm transition-colors">
                                Add to Cart
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" disabled variant="outline" className="w-full h-8 sm:h-9 text-xs sm:text-sm mt-2 border-gray-200 text-gray-400 bg-gray-50 rounded-sm">
                              Out of stock
                            </Button>
                          )}
                      </CardFooter>
                    </Card>
                   )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky top-[90px] self-start">
        <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
          <CardHeader className="border-b border-gray-200 bg-white pb-3 pt-4 px-4 sm:px-6 rounded-t-sm">
            <CardTitle className="text-base font-medium text-gray-500 uppercase tracking-wide">
              PRICE DETAILS
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-4 pb-0">
            {cart.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto pr-2 -mr-2 space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <p className="font-medium text-sm text-gray-800 line-clamp-1">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.quantity} x ₹{Number(item.rate || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-medium text-sm text-gray-900">
                          ₹{Number((item.rate || 0) * item.quantity).toLocaleString('en-IN')}
                        </p>
                        <button onClick={() => updateQuantity(item.id, 0)} className="text-xs text-gray-400 hover:text-red-500 uppercase font-medium">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-dashed border-gray-200 space-y-3 pb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Price ({cartItemCount} items)</span>
                      <span className="font-medium">₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Delivery Charges</span>
                      <span className="text-[#388e3c] font-medium">Free</span>
                    </div>
                </div>
                
                <div className="pt-4 border-t border-dashed border-gray-200 pb-4">
                    <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                      <span>Total Amount</span>
                      <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                <div className="pt-2 pb-4">
                  <Button className="w-full h-12 bg-[#fb641b] hover:bg-[#e05615] text-white text-base font-medium rounded-sm shadow-sm transition-colors">
                    PLACE ORDER
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <img src="https://rukminim2.flixcart.com/www/800/800/promos/16/05/2019/d438a32e-765a-4d8b-b4a6-520b560971e8.png?q=90" alt="Empty Cart" className="w-40 mb-4 opacity-90" />
                <p className="text-lg font-medium text-gray-900">Your cart is empty!</p>
                <p className="text-sm text-gray-500 mt-2">Add items to it now.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
