import initialEmployees from './users.json';

const DB_KEY = 'employee_portal_db';

const initialData = {
  employees: initialEmployees,
  leaves: [
    {
      id: 'L1001',
      employeeId: 'E001',
      employeeName: 'John Doe',
      type: 'Vacation',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      reason: 'Summer family trip to Europe',
      status: 'Approved',
      requestDate: '2026-06-10'
    },
    {
      id: 'L1002',
      employeeId: 'E002',
      employeeName: 'Sarah Jenkins',
      type: 'Sick Leave',
      startDate: '2026-06-14',
      endDate: '2026-06-15',
      reason: 'Dental appointment and recovery',
      status: 'Approved',
      requestDate: '2026-06-12'
    },
    {
      id: 'L1003',
      employeeId: 'E003',
      employeeName: 'Marcus Chen',
      type: 'Personal Leave',
      startDate: '2026-06-25',
      endDate: '2026-06-26',
      reason: 'Moving to a new apartment',
      status: 'Pending',
      requestDate: '2026-06-15'
    }
  ],
  attendance: [
    {
      id: 'A2001',
      employeeId: 'E001',
      date: '2026-06-15',
      clockIn: '09:02:14',
      clockOut: '17:35:40',
      totalHours: '8.5',
      workMode: 'Office',
      lateStatus: 'Ontime',
      overtimeHours: '0.50'
    },
    {
      id: 'A2002',
      employeeId: 'E002',
      date: '2026-06-15',
      clockIn: '08:55:00',
      clockOut: '17:05:00',
      totalHours: '8.1',
      workMode: 'Office',
      lateStatus: 'Ontime',
      overtimeHours: '0.10'
    }
  ],
  documents: [
    {
      id: 'D3001',
      employeeId: 'E001',
      name: 'ID_Proof_John_Doe.pdf',
      type: 'pdf',
      fileData: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
      uploadDate: '2026-05-10'
    }
  ],
  performance_reviews: [
    {
      id: 'PR4001',
      employeeId: 'E001',
      reviewerId: 'E004',
      reviewerName: 'Emily Watson',
      period: 'Q1 2026',
      rating: '4.8',
      comments: 'John has performed exceptionally well in leading the React architecture refactor.',
      reviewDate: '2026-04-10'
    }
  ],
  audit_logs: [
    {
      id: 'LOG5001',
      userId: 'E001',
      userName: 'John Doe',
      action: 'Clock In',
      details: 'Clocked in from Office',
      timestamp: '2026-06-15T09:02:14Z'
    }
  ]
};

const populateEmp = (emp) => {
  let roleLevel = 'Employee';
  const roleLower = (emp.role || '').toLowerCase();
  if (roleLower.includes('hr') || roleLower.includes('director')) {
    roleLevel = 'HR';
  } else if (roleLower.includes('admin')) {
    roleLevel = 'Admin';
  } else if (roleLower.includes('lead') || roleLower.includes('manager') || roleLower.includes('head') || emp.id === 'E002' || emp.id === 'E005') {
    roleLevel = 'Manager';
  }

  const idNum = parseInt(emp.id.replace(/\D/g, ''), 10) || 1;
  const month = String(((idNum - 1) % 12) + 1).padStart(2, '0');
  const day = String(((idNum * 3) % 28) + 1).padStart(2, '0');
  const birthDate = `1990-${month}-${day}`;

  let reportingManagerId = '';
  if (roleLevel === 'Employee') {
    if (emp.department === 'Engineering') reportingManagerId = 'E021';
    else if (emp.department === 'Design') reportingManagerId = 'E002';
    else if (emp.department === 'Marketing') reportingManagerId = 'E003';
    else if (emp.department === 'HR') reportingManagerId = 'E004';
    else reportingManagerId = 'E005';
  }

  const defaultSkills = emp.department === 'Engineering'
    ? 'React, JavaScript, Node.js, HTML/CSS'
    : emp.department === 'Design'
    ? 'Figma, UI/UX Design, Photoshop'
    : emp.department === 'Marketing'
    ? 'SEO, Content Strategy, Google Analytics'
    : 'HR Operations, Recruiting, Employee Relations';

  return {
    photoUrl: '',
    skills: defaultSkills,
    certifications: 'AWS Certified Cloud Practitioner',
    emergencyName: 'Jane R. Doe',
    emergencyPhone: '+1 (555) 999-8888',
    reportingManagerId,
    birthDate,
    workMode: idNum % 3 === 0 ? 'Remote' : idNum % 3 === 1 ? 'Hybrid' : 'Office',
    roleLevel,
    ...emp
  };
};

export const getDB = () => {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    const populatedEmployees = initialData.employees.map(emp => populateEmp(emp));
    const populatedData = { ...initialData, employees: populatedEmployees };
    localStorage.setItem(DB_KEY, JSON.stringify(populatedData));
    return populatedData;
  }
  const parsed = JSON.parse(data);
  if (!parsed.documents) parsed.documents = initialData.documents;
  if (!parsed.performance_reviews) parsed.performance_reviews = initialData.performance_reviews;
  if (!parsed.audit_logs) parsed.audit_logs = initialData.audit_logs;
  parsed.employees = parsed.employees.map(emp => populateEmp(emp));
  return parsed;
};

export const saveDB = (data) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};
