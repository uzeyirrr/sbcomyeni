import { pb } from './pocketbase';

// Slot tipi
export interface AppointmentSlot {
  id: string;
  name: string;
  start: number; // Başlangıç saati (saat olarak)
  end: number; // Bitiş saati (saat olarak)
  space: number; // Randevular arası zaman aralığı (saat olarak)
  team: string[]; // Takım ID'leri
  category: string; // Kategori ID
  company: string; // Şirket ID
  deaktif: boolean; // Slot aktif mi?
  appointments: string[]; // Oluşturulan randevuların ID'leri
  date: string; // Slot tarihi
  created: string;
  updated: string;
  expand?: {
    team?: any[];
    category?: any;
    company?: any;
    appointments?: Appointment[];
  };
}

// Randevu tipi
export type Appointment = {
  id: string;
  name: string;
  slot: string;
  customer: string;
  status: 'empty' | 'edit' | 'okay';
  created: string;
  updated: string;
  expand?: {
    customer?: {
      id: string;
      name: string;
      surname: string;
      tel: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
};

// Tüm randevu slotlarını getir
export async function getAppointmentSlots(filter?: string): Promise<AppointmentSlot[]> {
  try {
    const options: any = {
      sort: 'date',
      expand: 'team,category,company,appointments.customer',
    };
    
    if (filter) {
      options.filter = filter;
    }
    
    const records = await pb.collection('appointments_slots').getFullList(options);
    return records as unknown as AppointmentSlot[];
  } catch (error) {
    console.error('Error fetching appointment slots:', error);
    return [];
  }
}

// ID'ye göre slot getir
export async function getAppointmentSlotById(id: string): Promise<AppointmentSlot | null> {
  try {
    console.log("Fetching slot with ID:", id);
    if (!id) {
      console.error("Invalid slot ID provided");
      return null;
    }
    
    // Önce slot'u getir
    const record = await pb.collection('appointments_slots').getOne(id, {
      expand: 'team,category,company,appointments',
    });
    
    console.log("Slot record fetched:", record);
    
    // Slot verilerini dönüştür
    const slot = record as unknown as AppointmentSlot;
    
    // Randevuları getir (eğer expand ile gelmemişse)
    if (!slot.expand?.appointments) {
      try {
        // Slot'a ait randevuları getir
        const appointmentsResponse = await pb.collection('appointments').getList(1, 50, {
          filter: `slot="${id}"`,
        });
        
        // Randevuları slot nesnesine ekle
        if (appointmentsResponse && appointmentsResponse.items) {
          if (!slot.expand) slot.expand = {};
          slot.expand.appointments = appointmentsResponse.items as unknown as Appointment[];
        }
      } catch (appointmentError) {
        console.error(`Error fetching appointments for slot ${id}:`, appointmentError);
      }
    }
    
    return slot;
  } catch (error) {
    console.error(`Error fetching appointment slot with ID ${id}:`, error);
    return null;
  }
}

// Yeni slot oluştur ve otomatik randevular oluştur
export async function createAppointmentSlot(data: Partial<AppointmentSlot>): Promise<AppointmentSlot | null> {
  try {
    // Slot oluştur
    const slot = await pb.collection('appointments_slots').create(data);
    
    // Slot oluşturulduktan sonra otomatik randevular oluştur
    const start = data.start || 0;
    const end = data.end || 0;
    const space = data.space || 1;
    
    // Başlangıç ve bitiş saatleri arasında, space değeri kadar aralıklarla randevular oluştur
    const appointmentIds = [];
    for (let hour = start; hour < end; hour += space) {
      // Randevu adı (saat)
      const appointmentName = `${hour}:00`;
      
      // Randevu oluştur
      const appointment = await pb.collection('appointments').create({
        name: appointmentName,
        status: 'empty', // Başlangıçta boş
      });
      
      appointmentIds.push(appointment.id);
    }
    
    // Slot'u güncelle ve oluşturulan randevuları ilişkilendir
    if (appointmentIds.length > 0) {
      await pb.collection('appointments_slots').update(slot.id, {
        appointments: appointmentIds,
      });
    }
    
    // Güncellenmiş slot'u getir
    return await getAppointmentSlotById(slot.id);
  } catch (error) {
    console.error('Error creating appointment slot:', error);
    return null;
  }
}

// Slot güncelle
export async function updateAppointmentSlot(id: string, data: Partial<AppointmentSlot>): Promise<AppointmentSlot | null> {
  try {
    await pb.collection('appointments_slots').update(id, data);
    return await getAppointmentSlotById(id);
  } catch (error) {
    console.error(`Error updating appointment slot with ID ${id}:`, error);
    return null;
  }
}

// Slot sil
export async function deleteAppointmentSlot(id: string): Promise<boolean> {
  try {
    // Önce slot'a bağlı randevuları al
    const slot = await getAppointmentSlotById(id);
    if (slot && slot.appointments && slot.appointments.length > 0) {
      // Randevuları sil
      for (const appointmentId of slot.appointments) {
        await pb.collection('appointments').delete(appointmentId);
      }
    }
    
    // Slot'u sil
    await pb.collection('appointments_slots').delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting appointment slot with ID ${id}:`, error);
    return false;
  }
}

// Randevu güncelle
export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
  try {
    const record = await pb.collection('appointments').update(id, data);
    return record as unknown as Appointment;
  } catch (error) {
    console.error(`Error updating appointment with ID ${id}:`, error);
    return null;
  }
}

// Müşteriye randevu ata
export async function assignCustomerToAppointment(appointmentId: string, customerId: string): Promise<Appointment | null> {
  try {
    const record = await pb.collection('appointments').update(appointmentId, {
      customer: customerId,
      status: 'edit', // Müşteri atandığında durum 'edit' olur
    });
    return record as unknown as Appointment;
  } catch (error) {
    console.error(`Error assigning customer to appointment with ID ${appointmentId}:`, error);
    return null;
  }
}

// Randevuyu onayla
export async function approveAppointment(id: string): Promise<Appointment | null> {
  try {
    const record = await pb.collection('appointments').update(id, {
      status: 'okay',
    });
    return record as unknown as Appointment;
  } catch (error) {
    console.error(`Error approving appointment with ID ${id}:`, error);
    return null;
  }
}

// Randevudan müşteriyi kaldır
export async function removeCustomerFromAppointment(id: string): Promise<Appointment | null> {
  try {
    const record = await pb.collection('appointments').update(id, {
      customer: "", // Müşteri alanını boşalt
      status: 'empty', // Durumu boş olarak ayarla
    });
    return record as unknown as Appointment;
  } catch (error) {
    console.error(`Error removing customer from appointment with ID ${id}:`, error);
    return null;
  }
}
