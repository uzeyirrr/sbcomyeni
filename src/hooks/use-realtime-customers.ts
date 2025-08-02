import { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import { pb } from '@/lib/pocketbase';
import { toast } from 'sonner';
import { RecordSubscription } from 'pocketbase';

type RealtimeCustomerEvent = {
  action: 'create' | 'update' | 'delete';
  record: Customer;
};

export function useRealtimeCustomers(initialCustomers: Customer[] = []) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

  useEffect(() => {
    // İlk yüklemede müşteri listesini güncelle
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    // Gerçek zamanlı güncellemeleri dinle
    const unsubscribe = pb.collection('customers').subscribe('*', (data: RecordSubscription<Customer>) => {
      const event = {
        action: data.action,
        record: data.record as Customer
      };
      
      switch (event.action) {
        case 'create':
          setCustomers(prev => [event.record, ...prev]);
          toast.success('Yeni müşteri eklendi');
          break;
          
        case 'update':
          setCustomers(prev => 
            prev.map(customer => 
              customer.id === event.record.id ? event.record : customer
            )
          );
          toast.success('Müşteri bilgileri güncellendi');
          break;
          
        case 'delete':
          setCustomers(prev => 
            prev.filter(customer => customer.id !== event.record.id)
          );
          toast.success('Müşteri silindi');
          break;
      }
    });

    // Cleanup fonksiyonu
    return () => {
      pb.collection('customers').unsubscribe();
    };
  }, []);

  return customers;
} 