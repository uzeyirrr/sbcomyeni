import { pb } from './pocketbase';
import { User } from './user-service';

export interface Team {
  id: string;
  name: string;
  description: string;
  leader: string; // User ID
  members: string[]; // Array of User IDs
  created: string;
  updated: string;
  
  // Expanded fields (not from database)
  expand?: {
    leader?: User;
    members?: User[];
  };
}

// Get all teams with expanded leader and members
export async function getTeams(): Promise<Team[]> {
  try {
    const records = await pb.collection('teams').getList(1, 50, {
      sort: 'created',
      expand: 'leader,members',
    });
    
    return records.items as unknown as Team[];
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
}

// Get top performing teams
export async function getTopTeams(limit: number = 3): Promise<{ team: Team, customerCount: number }[]> {
  try {
    // Tüm takımları al
    const teams = await getTeams();
    
    // Tüm müşterileri al
    const customersResult = await pb.collection('customers').getList(1, 500, {
      sort: '-created',
    });
    const customers = customersResult.items;
    
    // Her takım için müşteri sayısını hesapla
    const teamPerformance = teams.map(team => {
      // Takım üyelerinin ID'lerini al
      const memberIds = team.members || [];
      
      // Takım üyelerine ait müşterileri say
      const customerCount = customers.filter(customer => 
        memberIds.includes(customer.agent)
      ).length;
      
      return { team, customerCount };
    });
    
    // Müşteri sayısına göre sırala ve ilk 'limit' kadarını döndür
    return teamPerformance
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top teams:', error);
    return [];
  }
}

// Get team performance statistics
export async function getTeamPerformanceStats(): Promise<{ 
  totalTeams: number, 
  topTeams: { team: Team, customerCount: number }[],
  averageCustomersPerTeam: number
}> {
  try {
    const teams = await getTeams();
    const topTeams = await getTopTeams(3);
    
    // Toplam müşteri sayısını hesapla
    const totalCustomers = topTeams.reduce((sum, item) => sum + item.customerCount, 0);
    
    // Takım başına ortalama müşteri sayısı
    const averageCustomersPerTeam = teams.length > 0 ? Math.round(totalCustomers / teams.length) : 0;
    
    return {
      totalTeams: teams.length,
      topTeams,
      averageCustomersPerTeam
    };
  } catch (error) {
    console.error('Error calculating team performance stats:', error);
    return {
      totalTeams: 0,
      topTeams: [],
      averageCustomersPerTeam: 0
    };
  }
}

// Get a single team by ID
export async function getTeamById(id: string): Promise<Team | null> {
  try {
    const record = await pb.collection('teams').getOne(id, {
      expand: 'leader,members',
    });
    
    return record as unknown as Team;
  } catch (error) {
    console.error(`Error fetching team with ID ${id}:`, error);
    return null;
  }
}

// Create a new team
export async function createTeam(data: Partial<Team>) {
  try {
    const record = await pb.collection('teams').create(data);
    return { success: true, data: record };
  } catch (error) {
    console.error('Error creating team:', error);
    return { success: false, error };
  }
}

// Update a team
export async function updateTeam(id: string, data: Partial<Team>) {
  try {
    const record = await pb.collection('teams').update(id, data);
    return { success: true, data: record };
  } catch (error) {
    console.error(`Error updating team with ID ${id}:`, error);
    return { success: false, error };
  }
}

// Delete a team
export async function deleteTeam(id: string): Promise<boolean> {
  try {
    await pb.collection('teams').delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting team with ID ${id}:`, error);
    return false;
  }
}
