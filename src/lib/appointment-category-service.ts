import { pb } from './pocketbase';

export interface AppointmentCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  deaktif: boolean;
  created: string;
  updated: string;
}

// Get all appointment categories
export async function getAppointmentCategories(): Promise<AppointmentCategory[]> {
  try {
    const records = await pb.collection('appointments_category').getList(1, 100, {
      sort: 'created',
    });
    
    return records.items as unknown as AppointmentCategory[];
  } catch (error) {
    console.error('Error fetching appointment categories:', error);
    return [];
  }
}

// Get a single appointment category by ID
export async function getAppointmentCategoryById(id: string): Promise<AppointmentCategory | null> {
  try {
    const record = await pb.collection('appointments_category').getOne(id);
    
    return record as unknown as AppointmentCategory;
  } catch (error) {
    console.error(`Error fetching appointment category with ID ${id}:`, error);
    return null;
  }
}

// Create a new appointment category
export async function createAppointmentCategory(data: Partial<AppointmentCategory>) {
  try {
    const record = await pb.collection('appointments_category').create(data);
    return { success: true, data: record };
  } catch (error) {
    console.error('Error creating appointment category:', error);
    return { success: false, error };
  }
}

// Update an appointment category
export async function updateAppointmentCategory(id: string, data: Partial<AppointmentCategory>) {
  try {
    const record = await pb.collection('appointments_category').update(id, data);
    return { success: true, data: record };
  } catch (error) {
    console.error(`Error updating appointment category with ID ${id}:`, error);
    return { success: false, error };
  }
}

// Delete an appointment category
export async function deleteAppointmentCategory(id: string): Promise<boolean> {
  try {
    await pb.collection('appointments_category').delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting appointment category with ID ${id}:`, error);
    return false;
  }
}
