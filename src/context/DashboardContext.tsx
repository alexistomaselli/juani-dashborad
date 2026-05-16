'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderWithProduct, Customer } from '@/types';

interface DashboardContextType {
  orders: OrderWithProduct[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
  handleUpdateOrder: (id: string, data: Partial<OrderWithProduct>) => Promise<void>;
  handleDeleteOrder: (id: string) => Promise<void>;
  orderToEdit: OrderWithProduct | null;
  setOrderToEdit: (order: OrderWithProduct | null) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  customers: Customer[];
  fetchCustomers: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Customer')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (Array.isArray(data)) setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Order')
        .select(`
          *,
          customer:Customer(*),
          productRef:Product(*)
        `)
        .order('orderNumber', { ascending: false });

      if (error) throw error;
      if (Array.isArray(data)) setOrders(data);
      
      // Also fetch customers whenever orders are fetched to keep total count updated
      fetchCustomers();
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCustomers]);

  const handleUpdateOrder = async (id: string, data: Partial<OrderWithProduct>) => {
    try {
      // First, get the current order to see if it has a customerId
      const { data: order, error: fetchError } = await supabase
        .from('Order')
        .select('customerId')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Update the Order table
      const { error: orderError } = await supabase
        .from('Order')
        .update(data)
        .eq('id', id);
      
      if (orderError) throw orderError;

      // If there's a customerId, sync relevant fields to the Customer table
      if (order?.customerId) {
        const customerUpdate: any = {};
        if (data.whatsapp !== undefined) customerUpdate.whatsapp = data.whatsapp;
        if (data.customerName !== undefined) customerUpdate.name = data.customerName;
        if (data.deliveryAddress !== undefined) customerUpdate.address = data.deliveryAddress;

        if (Object.keys(customerUpdate).length > 0) {
          const { error: customerError } = await supabase
            .from('Customer')
            .update(customerUpdate)
            .eq('id', order.customerId);
          
          if (customerError) {
            console.error('Error updating customer record:', customerError);
            // We don't throw here to avoid failing the whole operation if customer sync fails
          }
        }
      }

      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Order')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const [orderToEdit, setOrderToEdit] = useState<OrderWithProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <DashboardContext.Provider value={{
      orders,
      loading,
      fetchOrders,
      handleUpdateOrder,
      handleDeleteOrder,
      orderToEdit,
      setOrderToEdit,
      isModalOpen,
      setIsModalOpen,
      customers,
      fetchCustomers
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
