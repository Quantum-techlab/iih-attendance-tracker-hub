
// Initialize demo data for testing
export const seedDemoData = () => {
  // Check if data already exists
  if (localStorage.getItem('users')) {
    return;
  }

  // Create demo admin account
  const demoAdmin = {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@iih.ng',
    internId: 'ADMIN001',
    phoneNumber: '+234-800-123-4567',
    password: 'admin123',
    role: 'admin'
  };

  // Create demo intern accounts
  const demoInterns = [
    {
      id: 'intern-1',
      name: 'Adeolu Adebayo',
      email: 'adeolu@example.com',
      internId: 'IIH001',
      phoneNumber: '+234-801-234-5678',
      password: 'intern123',
      role: 'intern'
    },
    {
      id: 'intern-2',
      name: 'Fatima Ibrahim',
      email: 'fatima@example.com',
      internId: 'IIH002',
      phoneNumber: '+234-802-345-6789',
      password: 'intern123',
      role: 'intern'
    },
    {
      id: 'intern-3',
      name: 'Chinedu Okafor',
      email: 'chinedu@example.com',
      internId: 'IIH003',
      phoneNumber: '+234-803-456-7890',
      password: 'intern123',
      role: 'intern'
    }
  ];

  const allUsers = [demoAdmin, ...demoInterns];
  localStorage.setItem('users', JSON.stringify(allUsers));

  // Create sample attendance records
  const sampleRecords = [];
  const today = new Date();
  
  // Generate records for the past 10 weekdays
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Only create records for weekdays
    if (date.getDay() >= 1 && date.getDay() <= 5) {
      const dateStr = date.toISOString().split('T')[0];
      
      demoInterns.forEach((intern, index) => {
        // Simulate some missed days
        const shouldMiss = Math.random() < 0.15; // 15% chance to miss
        
        if (!shouldMiss) {
          const signInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
          const signOutHour = 17 + Math.floor(Math.random() * 2); // 5-6 PM
          
          const record = {
            id: `record-${intern.id}-${dateStr}`,
            userId: intern.id,
            date: dateStr,
            signInTime: `${signInHour}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`,
            signOutTime: `${signOutHour === 17 ? 5 : 6}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} PM`,
            status: 'present'
          };
          sampleRecords.push(record);
        }
      });
    }
  }
  
  localStorage.setItem('attendanceRecords', JSON.stringify(sampleRecords));
  
  console.log('Demo data seeded successfully!');
  console.log('Admin login: admin@iih.ng / admin123');
  console.log('Intern login: adeolu@example.com / intern123');
};
