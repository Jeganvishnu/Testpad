import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Users, Filter, Eye } from 'lucide-react';
import StudentProgressModal from './StudentProgressModal';

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  registrationNumber: string;
}

interface Test {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
}

interface StudentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  studentProgress?: Record<string, any>;
  tests?: Test[];
  onStudentDeleted?: () => void;
}

type SortField = 'name' | 'email' | 'department' | 'registrationNumber';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'list' | 'grouped';

const StudentListModal: React.FC<StudentListModalProps> = ({ isOpen, onClose, students, studentProgress = {}, tests = [], onStudentDeleted }) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Get unique departments for filtering
  const departments = useMemo(() => {
    const depts = [...new Set(students.map(student => student.department))].sort();
    return depts;
  }, [students]);

  // Sort and filter students
  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = students;
    
    // Filter by department if selected
    if (selectedDepartment !== 'all') {
      filtered = students.filter(student => student.department === selectedDepartment);
    }
    
    // Sort students
    return filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Convert to lowercase for case-insensitive sorting
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, sortField, sortOrder, selectedDepartment]);

  // Group students by department
  const groupedStudents = useMemo(() => {
    const groups: Record<string, Student[]> = {};
    
    sortedAndFilteredStudents.forEach(student => {
      if (!groups[student.department]) {
        groups[student.department] = [];
      }
      groups[student.department].push(student);
    });
    
    // Sort each group by name
    Object.keys(groups).forEach(dept => {
      groups[dept].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    });
    
    return groups;
  }, [sortedAndFilteredStudents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="inline w-4 h-4 ml-1" /> : 
      <ChevronDown className="inline w-4 h-4 ml-1" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="card-modern w-full max-w-5xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-themed-primary">Student List</h2>
            <p className="text-themed-secondary text-sm">({sortedAndFilteredStudents.length} students)</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                viewMode === 'grouped' 
                  ? 'bg-themed-primary text-white' 
                  : 'bg-themed-bg text-themed-secondary border border-themed-border hover:bg-themed-bg-secondary'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{viewMode === 'list' ? 'Group by Dept' : 'List View'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-4 p-4 bg-themed-bg border border-themed-border rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-themed-primary/10 rounded-lg flex items-center justify-center">
              <Filter className="w-4 h-4 text-themed-primary" />
            </div>
            <label className="text-sm font-medium text-themed-secondary">Department:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-themed-border bg-themed-bg rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-colors duration-150"
            >
              <option value="all">All Departments ({students.length})</option>
              {departments.map(dept => {
                const count = students.filter(s => s.department === dept).length;
                return (
                  <option key={dept} value={dept}>{dept} ({count})</option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'list' ? (
            // List View
            <div className="card-modern overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-themed-bg-secondary">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase cursor-pointer hover:bg-themed-bg transition-colors duration-150"
                      onClick={() => handleSort('name')}
                      style={{ width: '20%' }}
                    >
                      Name {getSortIcon('name')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase cursor-pointer hover:bg-themed-bg transition-colors duration-150"
                      onClick={() => handleSort('email')}
                      style={{ width: '25%' }}
                    >
                      Email {getSortIcon('email')}
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-medium text-themed-secondary uppercase cursor-pointer hover:bg-themed-bg transition-colors duration-150"
                      onClick={() => handleSort('department')}
                      style={{ width: '15%' }}
                    >
                      Department {getSortIcon('department')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase cursor-pointer hover:bg-themed-bg transition-colors duration-150"
                      onClick={() => handleSort('registrationNumber')}
                      style={{ width: '20%' }}
                    >
                      Registration Number {getSortIcon('registrationNumber')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-themed-secondary uppercase" style={{ width: '20%' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-themed-bg divide-y divide-themed-border">
                  {sortedAndFilteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-themed-bg-secondary transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium text-themed-primary">
                        <div className="truncate max-w-[150px]" title={student.name}>
                          {student.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-themed-secondary">
                        <div className="truncate max-w-[200px]" title={student.email}>
                          {student.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-themed-secondary">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-500 text-white">
                          {student.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-themed-secondary">
                        <div className="truncate max-w-[120px]" title={student.registrationNumber}>
                          {student.registrationNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowProgressModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors duration-150"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Progress
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Grouped View
            <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
              {Object.entries(groupedStudents).map(([department, deptStudents]) => (
                <div key={department} className="card-modern overflow-hidden">
                  <div className="bg-gradient-to-r from-themed-primary/10 to-themed-primary/5 px-6 py-4 border-b border-themed-border">
                    <h3 className="text-lg font-semibold text-themed-primary flex items-center">
                      <div className="h-8 w-8 bg-themed-primary/20 rounded-lg flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-themed-primary" />
                      </div>
                      {department} ({deptStudents.length} students)
                    </h3>
                  </div>
                  <div className="bg-themed-bg overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-themed-bg-secondary">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase" style={{ width: '25%' }}>
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase" style={{ width: '35%' }}>
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase" style={{ width: '25%' }}>
                            Registration Number
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-themed-secondary uppercase" style={{ width: '15%' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-themed-bg divide-y divide-themed-border">
                        {deptStudents.map(student => (
                          <tr key={student.id} className="hover:bg-themed-bg-secondary transition-colors duration-150">
                            <td className="px-6 py-4 text-sm font-medium text-themed-primary">
                              <div className="truncate max-w-[150px]" title={student.name}>
                                {student.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-themed-secondary">
                              <div className="truncate max-w-[200px]" title={student.email}>
                                {student.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-themed-secondary">
                              <div className="truncate max-w-[120px]" title={student.registrationNumber}>
                                {student.registrationNumber}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-medium">
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowProgressModal(true);
                                }}
                                className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Progress
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {sortedAndFilteredStudents.length === 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-themed-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-themed-muted" />
              </div>
              <h3 className="text-lg font-medium text-themed-primary">No students found</h3>
              <p className="mt-2 text-themed-secondary">No students match the current filter criteria.</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between items-center pt-4 border-t border-themed-border">
          <div className="text-sm text-themed-secondary">
            Showing {sortedAndFilteredStudents.length} of {students.length} students
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-150 font-medium flex items-center space-x-2"
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Student Progress Modal */}
      {selectedStudent && (
        <StudentProgressModal
          isOpen={showProgressModal}
          onClose={() => {
            setShowProgressModal(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          studentProgress={studentProgress}
          tests={tests}
          onStudentDeleted={onStudentDeleted}
        />
      )}
    </div>
  );
};

export default StudentListModal;

