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
import { addDoc, collection, doc, updateDoc, deleteDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useCollection } from '@/firebase';
import { Loader2, PackagePlus, GripVertical, Save, Trash, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import placeholderImageData from '@/lib/placeholder-images.json';
import { uploadFile as uploadToSupabase } from '@/supabase/storage';


function getCleanImageUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/^"|"$/g, '').replace(/\\/g, '/');
  const publicIndex = clean.toLowerCase().indexOf('/public/');
  if (publicIndex !== -1) {
    return clean.substring(publicIndex + 7);
  }
  return clean;
}

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  size: z.string().min(1, 'Product size is required'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  position: z.coerce.number(),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const SortableItem = ({ product, handleOpenDialog }: { product: any, handleOpenDialog: (p: any) => void }) => {
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
      className="flex items-center bg-white p-3 my-2 rounded-lg shadow-sm border"
    >
      <div {...attributes} {...listeners} className="cursor-grab p-2 touch-none">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
       <div className="relative h-12 w-12 mr-4 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
        {product.imageUrl && getCleanImageUrl(product.imageUrl) && !getCleanImageUrl(product.imageUrl).startsWith('file:///') && !getCleanImageUrl(product.imageUrl).match(/^[a-zA-Z]:\//) ? (
            <img src={getCleanImageUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-contain" />
        ) : (
            <ImageIcon className="h-6 w-6 text-gray-400" />
        )}
      </div>
      <div className="flex-grow grid grid-cols-4 gap-4 items-center">
        <div className="font-medium truncate">{product.name}</div>
        <div className="truncate">{product.size}</div>
        <div>{product.rate?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) ?? 'N/A'}</div>
        <div>{product.stock}</div>
      </div>
      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(product)}>Edit</Button>
    </div>
  );
};


export function ProductManagement() {
  const productsQuery = useMemo(() => query(collection(db, 'products'), orderBy('position')), []);
  const { data: initialProducts, loading } = useCollection(productsQuery);
  const [products, setProducts] = useState<any[]>([]);
  const [isOrderChanged, setIsOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);


  useEffect(() => {
    if(initialProducts) {
        const productsWithImages = initialProducts.map((p, index) => ({
            ...p,
            imageUrl: p.imageUrl || placeholderImageData.products[index % placeholderImageData.products.length].src,
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
    setImageFile(null);
    if (product) {
      reset({ name: product.name, size: product.size, stock: product.stock, rate: product.rate, position: product.position, imageUrl: product.imageUrl });
    } else {
      reset({ name: '', size: '', stock: 0, rate: 0, position: products.length, imageUrl: '' });
    }
    setOpen(true);
  };
  
  const handleCloseDialog = () => {
    setOpen(false);
    setEditingProduct(null);
    setImageFile(null);
  }

  const uploadFile = async (file: File, path: string): Promise<string> => {
    return await uploadToSupabase(file, path);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    let finalImageUrl = data.imageUrl?.trim() || editingProduct?.imageUrl || '';
    
    try {
      if (imageFile) {
        finalImageUrl = await uploadFile(imageFile, `products/${Date.now()}_${imageFile.name}`);
      } else if (finalImageUrl) {
        // Clean up the pasted image URL if it is a local path
        finalImageUrl = finalImageUrl.replace(/^"|"$/g, '').replace(/\\/g, '/');
        const publicIndex = finalImageUrl.toLowerCase().indexOf('/public/');
        if (publicIndex !== -1) {
          finalImageUrl = finalImageUrl.substring(publicIndex + 7);
        } else if (finalImageUrl.startsWith('file:///') || finalImageUrl.match(/^[a-zA-Z]:\//)) {
          toast({
            variant: 'destructive',
            title: 'Invalid Local Path',
            description: 'Browsers block loading files from outside the project. Please place your image in the "public" folder first and use a relative path like /image.png.',
            duration: 7000,
          });
          setIsSubmitting(false);
          return;
        }
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
            imageUrl: finalImageUrl || placeholderImageData.products[products.length % placeholderImageData.products.length].src,
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
                    <Label htmlFor="image">Upload Product Image</Label>
                    <Input id="image" type="file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} accept="image/*" />
                 </div>
                 <div>
                    <Label htmlFor="imageUrl">Or Paste Product Image URL / Path</Label>
                    <Input id="imageUrl" placeholder="e.g. /pepsi.png or https://example.com/image.png" {...register('imageUrl')} />
                 </div>
                 {(currentImageUrl || imageFile) && (
                     <div className="mt-4 relative w-24 h-24 rounded-md border bg-gray-100 flex items-center justify-center">
                          {imageFile ? (
                              <img
                                 src={URL.createObjectURL(imageFile)}
                                 alt="Product Preview"
                                 className="max-h-full max-w-full object-contain p-1 rounded-md"
                              />
                          ) : (
                              currentImageUrl && !currentImageUrl.startsWith('file:///') && !currentImageUrl.match(/^[a-zA-Z]:\//) && (
                                  <img
                                     src={getCleanImageUrl(currentImageUrl)}
                                     alt="Product Preview"
                                     className="max-h-full max-w-full object-contain p-1 rounded-md"
                                  />
                              )
                          )}
                     </div>
                 )}
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="size">Size</Label>
                  <Input id="size" {...register('size')} />
                  {errors.size && <p className="text-sm text-red-500 mt-1">{errors.size.message}</p>}
                </div>
                <div>
                  <Label htmlFor="rate">Rate (Price)</Label>
                  <Input id="rate" type="number" step="0.01" {...register('rate')} />
                  {errors.rate && <p className="text-sm text-red-500 mt-1">{errors.rate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input id="stock" type="number" {...register('stock')} />
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
                {products.map(product => <SortableItem key={product.id} product={product} handleOpenDialog={handleOpenDialog} />)}
                </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
