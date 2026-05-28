'use client';

import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Trash2, Plus, Minus, ShoppingBasket, Image as ImageIcon } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import placeholderImageData from '@/lib/placeholder-images.json';


export function NewOrder({ products: initialProducts = [], loading }: { products: any[], loading: boolean }) {
  const { cart, addToCart, updateQuantity, clearCart } = useCart();
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  const products = useMemo(() => {
    if (!initialProducts) return [];
    return initialProducts.map((p, index) => ({
      ...p,
      imageUrl: p.imageUrl || placeholderImageData.products[index % placeholderImageData.products.length].src,
      "data-ai-hint": "soda bottle",
    }));
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => {
                   return (
                    <Card key={product.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                       <div className="relative h-40 w-full bg-gray-100 flex items-center justify-center">
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    width={400}
                                    height={400}
                                    objectFit="contain"
                                    className="p-2"
                                    data-ai-hint={product['data-ai-hint']}
                                />
                            ) : (
                                <ImageIcon className="h-12 w-12 text-gray-300" />
                            )}
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-bold text-lg">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">{product.size}</p>
                          <div className="flex-grow"></div>
                          <div className="mt-4 text-sm">
                            <span className={`font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {product.stock > 0 ? `${product.stock} units available` : 'Out of Stock'}
                            </span>
                          </div>
                      </div>
                      <CardFooter className="flex-col items-stretch space-y-2 bg-gray-50/70 p-4">
                        {product.stock > 0 ? (
                            <>
                              <div className="flex w-full items-center justify-between gap-2">
                                <Button variant="outline" size="icon" className="h-9 w-9 bg-white" onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) - 1)}>
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={quantities[product.id] || 1}
                                  onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                  className="w-16 h-9 text-center font-bold"
                                />
                                <Button variant="outline" size="icon" className="h-9 w-9 bg-white" onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) + 1)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button size="sm" onClick={() => handleAddToCart(product)} className="w-full h-9">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add to Cart
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" disabled variant="destructive" className="w-full">
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
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShoppingBasket className="h-6 w-6"/>
              Your Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto pr-2 -mr-2 space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium">{item.name} ({item.size})</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} units
                        </p>
                      </div>
                       <Button size="icon" variant="ghost" onClick={() => updateQuantity(item.id, 0)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                 <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={clearCart}>Clear Cart</Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Add products to start an order.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
