import { pb } from './pocketbase';
import { Customer, CustomerFormData } from '@/types/customer';

// Customer ve CustomerFormData tiplerini yeniden dışa aktar
export type { Customer, CustomerFormData } from '@/types/customer';

// Gerçek zamanlı güncellemeler için event tipleri
export type RealtimeCustomerEvent = {
  action: 'create' | 'update' | 'delete';
  record: Customer;
};

// Gerçek zamanlı güncellemeler için callback tipi
export type RealtimeCallback = (event: RealtimeCustomerEvent) => void;

// Get all customers
export async function getCustomers(): Promise<Customer[]> {
  try {
    console.log('Fetching customers with expand...');
    const records = await pb.collection('customers').getList(1, 50, {
      sort: '-created',
      expand: 'agent',
    });
    console.log('Raw records from PocketBase:', records.items);
    console.log('First record expand:', records.items[0]?.expand);
    return records.items as unknown as Customer[];
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

// Get latest customers
export async function getLatestCustomers(limit: number = 5): Promise<Customer[]> {
  try {
    const records = await pb.collection('customers').getList(1, limit, {
      sort: '-created',
    });
    return records.items as unknown as Customer[];
  } catch (error) {
    console.error('Error fetching latest customers:', error);
    return [];
  }
}

// Get customer statistics
export async function getCustomerStatistics() {
  try {
    const allCustomers = await getCustomers();
    const totalCustomers = allCustomers.length;
    
    // QC On durumu analizi
    const qcOnCounts: Record<string, number> = {};
    allCustomers.forEach(customer => {
      const status = customer.qc_on || "Belirtilmemiş";
      qcOnCounts[status] = (qcOnCounts[status] || 0) + 1;
    });
    
    // QC Final durumu analizi
    const qcFinalCounts: Record<string, number> = {};
    allCustomers.forEach(customer => {
      const status = customer.qc_final || "Belirtilmemiş";
      qcFinalCounts[status] = (qcFinalCounts[status] || 0) + 1;
    });
    
    // Satış durumu analizi
    const saleCounts: Record<string, number> = {};
    allCustomers.forEach(customer => {
      const status = customer.sale || "none";
      saleCounts[status] = (saleCounts[status] || 0) + 1;
    });
    
    return {
      totalCustomers,
      qcOnStats: Object.entries(qcOnCounts).map(([label, value]) => ({
        label,
        value,
        percentage: Math.round((value / totalCustomers) * 100)
      })),
      qcFinalStats: Object.entries(qcFinalCounts).map(([label, value]) => ({
        label,
        value,
        percentage: Math.round((value / totalCustomers) * 100)
      })),
      saleStats: Object.entries(saleCounts).map(([label, value]) => {
        let displayLabel = label;
        switch (label) {
          case "red": displayLabel = "Kırmızı"; break;
          case "green": displayLabel = "Yeşil"; break;
          case "blue": displayLabel = "Mavi"; break;
          case "yellow": displayLabel = "Sarı"; break;
          case "none": displayLabel = "Belirtilmemiş"; break;
        }
        
        return {
          label: displayLabel,
          originalLabel: label,
          value,
          percentage: Math.round((value / totalCustomers) * 100)
        };
      })
    };
  } catch (error) {
    console.error('Error calculating customer statistics:', error);
    return {
      totalCustomers: 0,
      qcOnStats: [],
      qcFinalStats: [],
      saleStats: []
    };
  }
}

// Get a customer by ID
export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const record = await pb.collection('customers').getOne(id);
    return record as unknown as Customer;
  } catch (error) {
    console.error(`Error fetching customer with ID ${id}:`, error);
    return null;
  }
}

// Create a new customer
export async function createCustomer(data: CustomerFormData): Promise<Customer | null> {
  try {
    // Zorunlu alanları kontrol et
    if (!data.name || !data.surname || !data.tel || !data.location) {
      throw new Error("Zorunlu alanlar eksik: Ad, Soyad, Telefon ve Konum alanları zorunludur.");
    }

    // Veriyi temizle ve dönüştür
    const formData = new FormData();

    // Temel alanları ekle
    formData.append('name', data.name);
    formData.append('surname', data.surname);
    formData.append('tel', data.tel);
    formData.append('location', data.location);

    // Opsiyonel alanları kontrol et ve ekle
    if (data.home_tel) formData.append('home_tel', data.home_tel);
    if (data.email) formData.append('email', data.email);
    if (data.home_people_number !== null && data.home_people_number !== undefined) {
      formData.append('home_people_number', data.home_people_number.toString());
    }
    if (data.age !== null && data.age !== undefined) {
      formData.append('age', data.age.toString());
    }
    if (data.street) formData.append('street', data.street);
    if (data.postal_code) formData.append('postal_code', data.postal_code);
    if (data.who_is_customer) formData.append('who_is_customer', data.who_is_customer);
    if (data.roof_type) formData.append('roof_type', data.roof_type);
    if (data.what_talked) formData.append('what_talked', data.what_talked);
    if (data.roof) formData.append('roof', data.roof);
    if (data.qc_on) formData.append('qc_on', data.qc_on);
    if (data.qc_final) formData.append('qc_final', data.qc_final);
    if (data.agent) formData.append('agent', data.agent);
    if (data.sale) formData.append('sale', data.sale);
    if (data.note) formData.append('note', data.note);

    // Çatı görseli varsa ve base64 formatındaysa
    if (data.roof_image && data.roof_image.startsWith('data:image')) {
      try {
        const base64Response = await fetch(data.roof_image);
        const blob = await base64Response.blob();
        const file = new File([blob], 'roof_image.jpg', { type: 'image/jpeg' });
        formData.append('roof_image', file);
      } catch (error) {
        console.error('Error processing roof image:', error);
        throw new Error('Çatı görseli işlenirken bir hata oluştu.');
      }
    }

    // API'ye gönderilecek veriyi logla
    console.log('Gönderilen veriler:', Object.fromEntries(formData.entries()));

    // Kaydı oluştur
    const record = await pb.collection('customers').create(formData);
    return record as unknown as Customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error instanceof Error) {
      throw new Error(`Müşteri oluşturulurken hata: ${error.message}`);
    } else {
      throw new Error('Müşteri oluşturulurken bilinmeyen bir hata oluştu.');
    }
  }
}

// Update a customer
export async function updateCustomer(id: string, data: Partial<CustomerFormData>): Promise<Customer | null> {
  try {
    // Eğer görsel base64 ise dosyaya çevir ve FormData ile gönder
    if (data.roof && typeof data.roof === 'string' && data.roof.startsWith('data:image')) {
      const base64Response = await fetch(data.roof);
      const blob = await base64Response.blob();
      const file = new File([blob], 'roof.jpg', { type: 'image/jpeg' });

      const apiFormData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'roof' && value !== undefined && value !== null) {
          apiFormData.append(key, value as string);
        }
      });
      apiFormData.append('roof', file);

      const record = await pb.collection('customers').update(id, apiFormData);
      
      // QC Final durumu değiştiyse randevu ilişkisini kontrol et
      if (data.qc_final) {
        await checkAndClearAppointment(id, data.qc_final);
      }
      
      return record as unknown as Customer;
    } else {
      // Eğer görsel yoksa veya dosya adıysa normal şekilde gönder
      const record = await pb.collection('customers').update(id, data);
      
      // QC Final durumu değiştiyse randevu ilişkisini kontrol et
      if (data.qc_final) {
        await checkAndClearAppointment(id, data.qc_final);
      }
      
      return record as unknown as Customer;
    }
  } catch (error) {
    console.error(`Error updating customer with ID ${id}:`, error);
    return null;
  }
}

// Müşterinin randevu ilişkisini kontrol et ve gerekirse boşalt
async function checkAndClearAppointment(customerId: string, qcFinalStatus: string) {
  try {
    // Belirli durumlar için randevuyu boşalt
    const statusesToClear = ['Rausgefallen', 'Rausgefallen WP', 'Neuleger', 'Neuleger WP'];
    
    if (statusesToClear.includes(qcFinalStatus)) {
      // Bu müşteriye ait randevuları bul
      const appointments = await pb.collection('appointments').getList(1, 50, {
        filter: `customer="${customerId}"`,
      });
      
      // Her randevuyu boşalt
      for (const appointment of appointments.items) {
        await pb.collection('appointments').update(appointment.id, {
          customer: "",
          status: 'empty',
        });
      }
      
      console.log(`Müşteri ${customerId} için randevular boşaltıldı. QC Final durumu: ${qcFinalStatus}`);
    }
  } catch (error) {
    console.error(`Error checking and clearing appointments for customer ${customerId}:`, error);
  }
}

// Delete a customer
export async function deleteCustomer(id: string): Promise<boolean> {
  try {
    await pb.collection('customers').delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting customer with ID ${id}:`, error);
    return false;
  }
}

// Müşteri koleksiyonundaki tüm değişikliklere abone ol
export function subscribeToCustomers(callback: RealtimeCallback) {
  return pb.collection('customers').subscribe('*', (data) => {
    callback(data as RealtimeCustomerEvent);
  });
}

// Belirli bir müşteriye abone ol
export function subscribeToCustomer(id: string, callback: RealtimeCallback) {
  return pb.collection('customers').subscribe(id, (data) => {
    callback(data as RealtimeCustomerEvent);
  });
}

// Aboneliği iptal et
export function unsubscribeFromCustomers(id?: string) {
  if (id) {
    pb.collection('customers').unsubscribe(id);
  } else {
    pb.collection('customers').unsubscribe();
  }
}

// Search customers
export async function searchCustomers(query: string): Promise<Customer[]> {
  try {
    const records = await pb.collection('customers').getList(1, 100, {
      filter: `name~"${query}" || surname~"${query}" || tel~"${query}" || email~"${query}"`,
    });
    return records.items as unknown as Customer[];
  } catch (error) {
    console.error('Error searching customers:', error);
    return [];
  }
}

// Get customers by agent
export async function getCustomersByAgent(agentId: string): Promise<Customer[]> {
  try {
    const records = await pb.collection('customers').getList(1, 500, {
      filter: `agent = "${agentId}"`,
      sort: '-created',
      expand: 'agent',
    });
    return records.items as unknown as Customer[];
  } catch (error) {
    console.error(`Error fetching customers for agent ${agentId}:`, error);
    return [];
  }
}
