'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { addDoc, collection, doc, updateDoc, deleteDoc, writeBatch, query, orderBy, setDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useCollection } from '@/firebase';
import { Loader2, PackagePlus, GripVertical, Save, Trash, Image as ImageIcon, Megaphone, FolderPlus, X } from 'lucide-react';
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

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  size: z.string().min(1, 'Product size is required'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  mrp: z.coerce.number().optional(),
  position: z.coerce.number(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const SortableItem = ({ product, handleOpenDialog, handleToggleAd }: { product: any, handleOpenDialog: (p: any) => void, handleToggleAd: (p: any) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-3 my-2 rounded-lg shadow-sm border transition-colors ${
        product.isAd ? 'bg-amber-50 border-amber-300' : 'bg-white'
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab p-2 touch-none">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
       <div className="relative h-12 w-12 mr-4 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
        {product.imageUrl && getCleanImageUrl(product.imageUrl) && !getCleanImageUrl(product.imageUrl).startsWith('file:///') && !getCleanImageUrl(product.imageUrl).match(/^[a-zA-Z]:[/]/) ? (
            <img src={getCleanImageUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-contain" />
        ) : (
            <ImageIcon className="h-6 w-6 text-gray-400" />
        )}
      </div>
      <div className="flex-grow grid grid-cols-4 gap-4 items-center">
        <div className="font-medium truncate flex items-center gap-2">
          {product.name}
          {product.isAd && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              <Megaphone className="h-3 w-3" /> Ad
            </span>
          )}
        </div>
        <div className="truncate">{product.size}</div>
        <div>{product.rate?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) ?? 'N/A'}</div>
        <div>{product.stock > 0 ? <span className="text-green-600 font-medium">In Stock</span> : <span className="text-red-600 font-medium">Out of Stock</span>}</div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <Button
          variant={product.isAd ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToggleAd(product)}
          className={product.isAd ? 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white' : ''}
          title={product.isAd ? 'Remove from Ads' : 'Mark as Ad'}
        >
          <Megaphone className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(product)}>Edit</Button>
      </div>
    </div>
  );
};


export function ProductManagement() {
  const productsQuery = useMemo(() => query(collection(db, 'products'), orderBy('position')), []);
  const { data: initialProducts, loading } = useCollection(productsQuery);
  const [products, setProducts] = useState<any[]>([]);
  const [isOrderChanged, setIsOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  
  const [adSettings, setAdSettings] = useState({
    isActive: false,
    type: 'image',
    imageUrl: '',
    productId: ''
  });
  const [isAdSaving, setIsAdSaving] = useState(false);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
  const [isCategorySaving, setIsCategorySaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'categories'), (docSnap) => {
      if (docSnap.exists()) {
        const rawList = docSnap.data().list || [];
        const parsedList = rawList.map((item: any) => 
          typeof item === 'string' ? { name: item, imageUrl: '' } : item
        );
        setCategories(parsedList);
      } else {
        // Initialize with default categories
        setDoc(doc(db, 'settings', 'categories'), { 
          list: [
            { name: 'pepsi', imageUrl: '' }, 
            { name: 'Bindu', imageUrl: '' }, 
            { name: 'water', imageUrl: '' }
          ] 
        });
      }
    });
    return () => unsub();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCategorySaving(true);
    try {
      const updatedList = [...categories, { name: newCategoryName.trim(), imageUrl: newCategoryImageUrl.trim() }];
      await setDoc(doc(db, 'settings', 'categories'), { list: updatedList }, { merge: true });
      setNewCategoryName('');
      setNewCategoryImageUrl('');
      toast({ title: 'Success', description: 'Category added.' });
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add category.' });
    } finally {
      setIsCategorySaving(false);
    }
  };

  const handleRemoveCategory = async (catNameToRemove: string) => {
    setIsCategorySaving(true);
    try {
      const updatedList = categories.filter(c => c.name !== catNameToRemove);
      await setDoc(doc(db, 'settings', 'categories'), { list: updatedList }, { merge: true });
      toast({ title: 'Success', description: 'Category removed.' });
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove category.' });
    } finally {
      setIsCategorySaving(false);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'advertisement'), (docSnap) => {
      if (docSnap.exists()) {
        setAdSettings(docSnap.data() as any);
      }
    });
    return () => unsub();
  }, []);

  const handleSaveAdSettings = async () => {
    setIsAdSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'advertisement'), adSettings);
      toast({ title: 'Success', description: 'Advertisement settings saved.' });
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save ad settings.' });
    } finally {
      setIsAdSaving(false);
    }
  };


  useEffect(() => {
    if(initialProducts) {
        const productsWithImages = initialProducts.map((p) => ({
            ...p,
            imageUrl: p.imageUrl || '/default_bottle.png',
        }));
        setProducts(productsWithImages);
        setIsOrderChanged(false);
    }
  }, [initialProducts]);
  
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });
  
  const currentImageUrl = watch('imageUrl');

  const handleOpenDialog = (product: any | null = null) => {
    setEditingProduct(product);
    if (product) {
      reset({ name: product.name, size: product.size, stock: product.stock > 0 ? 999999 : 0, rate: product.rate, mrp: product.mrp || 0, position: product.position, imageUrl: product.imageUrl, category: product.category || '' });
    } else {
      reset({ name: '', size: '', stock: 999999, rate: 0, mrp: 0, position: products.length, imageUrl: '', category: '' });
    }
    setOpen(true);
  };
  
  const handleCloseDialog = () => {
    setOpen(false);
    setEditingProduct(null);
  }

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    let finalImageUrl = editingProduct?.imageUrl || '';
    
    try {
      if (data.imageUrl && data.imageUrl.trim()) {
        const cleaned = getCleanImageUrl(data.imageUrl);
        if (cleaned.startsWith('file:///') || cleaned.match(/^[a-zA-Z]:[/]/)) {
          toast({
            variant: 'destructive',
            title: 'Invalid Local Path',
            description: 'Browsers block loading files from outside the project. Please place your image in the "public" folder first and use a relative path like /image.png.',
            duration: 7000,
          });
          setIsSubmitting(false);
          return;
        }
        finalImageUrl = cleaned;
      } else {
        finalImageUrl = '';
      }
      
      const productData = { ...data, imageUrl: finalImageUrl };

      if (editingProduct) {
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, productData);
        toast({ title: 'Success', description: 'Product updated successfully.' });
      } else {
        const newProductData = {
            ...productData,
            position: products.length,
            imageUrl: finalImageUrl || '/default_bottle.png',
        };
        await addDoc(collection(db, 'products'), newProductData);
        toast({ title: 'Success', description: 'Product added successfully.' });
      }
      handleCloseDialog();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string, imageUrl?: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            if (imageUrl && !imageUrl.includes('picsum.photos')) {
              const imageRef = ref(storage, imageUrl);
              await deleteObject(imageRef).catch(err => console.warn("Could not delete old image, may not exist.", err));
            }
            toast({ title: 'Success', description: 'Product deleted successfully.' });
            handleCloseDialog();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to delete product: ${error.message}` });
        }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProducts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setIsOrderChanged(true);
    }
  };

  const handleToggleAd = async (product: any) => {
    try {
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, { isAd: !product.isAd });
      toast({
        title: !product.isAd ? 'Marked as Ad' : 'Removed from Ads',
        description: !product.isAd
          ? `"${product.name}" will now be highlighted for customers.`
          : `"${product.name}" is no longer highlighted.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const batch = writeBatch(db);
      products.forEach((product, index) => {
        const productRef = doc(db, 'products', product.id);
        batch.update(productRef, { position: index });
      });
      await batch.commit();
      toast({ title: 'Success', description: 'Product order saved.' });
      setIsOrderChanged(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save product order.' });
    } finally {
      setIsSavingOrder(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Advertisement Banner Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="h-5 w-5 text-amber-500"/> Advertisement Banner Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="ad-active"
              checked={adSettings.isActive}
              onChange={(e) => setAdSettings({...adSettings, isActive: e.target.checked})}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="ad-active" className="font-semibold cursor-pointer">Enable Top Advertisement Banner in New Order Page</Label>
          </div>
          
          {adSettings.isActive && (
            <div className="pl-6 space-y-4 pt-2 border-l-2 border-gray-100">
              <div className="flex gap-4 items-center">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="adType" value="image" checked={adSettings.type === 'image'} onChange={() => setAdSettings({...adSettings, type: 'image'})} className="text-blue-600" />
                    <span>Custom Image URL</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="adType" value="product" checked={adSettings.type === 'product'} onChange={() => setAdSettings({...adSettings, type: 'product'})} className="text-blue-600" />
                    <span>Select Product</span>
                 </label>
              </div>
              
              {adSettings.type === 'image' && (
                <div>
                  <Label>Image URL (Web Link or Local Path)</Label>
                  <Input 
                    placeholder="https://example.com/banner.jpg" 
                    value={adSettings.imageUrl}
                    onChange={(e) => setAdSettings({...adSettings, imageUrl: e.target.value})}
                    className="mt-1 max-w-md"
                  />
                  {adSettings.imageUrl && (
                    <div className="mt-2 h-24 max-w-md rounded border flex items-center justify-center bg-gray-50 overflow-hidden">
                       <img src={getCleanImageUrl(adSettings.imageUrl)} alt="Preview" className="max-h-full object-cover" />
                    </div>
                  )}
                </div>
              )}
              
              {adSettings.type === 'product' && (
                <div>
                  <Label>Select Product to Highlight</Label>
                  <select 
                    value={adSettings.productId}
                    onChange={(e) => setAdSettings({...adSettings, productId: e.target.value})}
                    className="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Choose a product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.size})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          
          <Button onClick={handleSaveAdSettings} disabled={isAdSaving} className="mt-2">
            {isAdSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Banner Settings
          </Button>
        </CardContent>
      </Card>

      {/* Category Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><FolderPlus className="h-5 w-5 text-blue-500"/> Product Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {categories.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 pl-1 pr-3 py-1 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                <div className="h-6 w-6 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {cat.imageUrl ? (
                    <img src={getCleanImageUrl(cat.imageUrl)} alt={cat.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-3 w-3 text-gray-400" />
                  )}
                </div>
                <span>{cat.name}</span>
                <button onClick={() => handleRemoveCategory(cat.name)} className="text-gray-400 hover:text-red-500 transition-colors ml-1" disabled={isCategorySaving}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 max-w-xl mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <Input 
              placeholder="New Category Name" 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)} 
              className="w-1/3"
            />
            <Input 
              placeholder="Image URL (optional)" 
              value={newCategoryImageUrl} 
              onChange={(e) => setNewCategoryImageUrl(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              className="flex-1"
            />
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim() || isCategorySaving}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Product Inventory</CardTitle>
        <div className="flex items-center gap-2">
           {isOrderChanged && (
            <Button onClick={handleSaveOrder} disabled={isSavingOrder}>
                {isSavingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Order
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <PackagePlus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                     <Label htmlFor="imageUrl">Product Image URL / Path</Label>
                     <Input id="imageUrl" placeholder="e.g., /pepsi.png or https://example.com/pepsi.png" {...register('imageUrl')} />
                     {currentImageUrl && getCleanImageUrl(currentImageUrl) && !getCleanImageUrl(currentImageUrl).startsWith('file:///') && !getCleanImageUrl(currentImageUrl).match(/^[a-zA-Z]:[/]/) && (
                         <div className="mt-4 relative w-24 h-24 rounded-md border bg-gray-100">
                              <img
                                 src={getCleanImageUrl(currentImageUrl)}
                                 alt="Product Preview"
                                 className="h-full w-full object-contain rounded-md p-1"
                             />
                         </div>
                     )}
                  </div>
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    {...register('category')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- None --</option>
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="size">Size</Label>
                  <Input id="size" {...register('size')} />
                  {errors.size && <p className="text-sm text-red-500 mt-1">{errors.size.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mrp">Original Price (MRP)</Label>
                    <Input id="mrp" type="number" step="0.01" {...register('mrp')} />
                    {errors.mrp && <p className="text-sm text-red-500 mt-1">{errors.mrp.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="rate">Selling Price (Rate)</Label>
                    <Input id="rate" type="number" step="0.01" {...register('rate')} />
                    {errors.rate && <p className="text-sm text-red-500 mt-1">{errors.rate.message}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="stock">Stock Availability</Label>
                  <select
                    id="stock"
                    {...register('stock')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="999999">Stock there</option>
                    <option value="0">Not there</option>
                  </select>
                  {errors.stock && <p className="text-sm text-red-500 mt-1">{errors.stock.message}</p>}
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between pt-4 gap-2">
                  {editingProduct && (
                      <Button type="button" variant="destructive" onClick={() => handleDelete(editingProduct.id, editingProduct.imageUrl)} disabled={isSubmitting} className="sm:mr-auto">
                           <Trash className="mr-2 h-4 w-4" /> Delete
                      </Button>
                  )}
                  <div className="flex gap-2 ml-auto">
                      <Button type="button" variant="ghost" onClick={handleCloseDialog}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {editingProduct ? 'Update Product' : 'Save Product'}
                      </Button>
                  </div>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="min-w-[700px]">
            <div className="flex items-center bg-gray-50 p-3 my-2 rounded-lg font-semibold text-sm text-muted-foreground">
                <div className="p-2"><GripVertical className="h-5 w-5 invisible" /></div>
                <div className="w-[60px] mr-4">Image</div>
                <div className="flex-grow grid grid-cols-4 gap-4 items-center">
                    <div>Product</div>
                    <div>Size</div>
                    <div>Rate</div>
                    <div>Stock</div>
                </div>
                <div className="w-[68px]"></div>
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={products} strategy={verticalListSortingStrategy}>
                {products.map(product => <SortableItem key={product.id} product={product} handleOpenDialog={handleOpenDialog} handleToggleAd={handleToggleAd} />)}
                </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
