import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function AdminInstructorManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
      checkAdminAndFetch();
    }
  }, [user]);

  const checkAdminAndFetch = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID, waiting...');
        setLoading(false);
        return;
      }

      console.log('Checking admin status for user:', user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      console.log('User role:', profile?.role);

      if (profile?.role !== 'admin') {
        console.log('Not an admin, redirecting...');
        navigate('/dashboard');
        return;
      }

      console.log('Admin confirmed, fetching instructors...');
      await fetchInstructors();
    } catch (error) {
      console.error('Error checking admin:', error);
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      console.log('Starting to fetch instructors...');
      
      // Fetch instructors
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'instructor')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching instructors:', error);
        setInstructors([]);
        setLoading(false);
        return;
      }

      console.log('Instructors fetched:', data?.length || 0, 'instructors');

      // Add default counts
      const instructorsWithCounts = (data || []).map(instructor => ({
        ...instructor,
        courses: [{ count: 0 }],
        followers: [{ count: 0 }]
      }));

      setInstructors(instructorsWithCounts);
      console.log('Instructors set successfully');
      
    } catch (error) {
      console.error('Error in fetchInstructors:', error);
      setInstructors([]);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const toggleVerification = async (instructorId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', instructorId);

      if (error) throw error;

      // Update local state
      setInstructors(prev =>
        prev.map(inst =>
          inst.id === instructorId
            ? { ...inst, is_verified: !currentStatus }
            : inst
        )
      );

      alert(`Instructor ${!currentStatus ? 'verified' : 'unverified'} successfully!`);
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('Failed to update verification status');
    }
  };

  const filteredInstructors = instructors.filter(inst =>
    inst.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Instructor Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage instructor verification badges and profiles
          </p>
        </div>

        {/* Search */}
        <div className="card mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search instructors by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Instructors</p>
            <p className="text-3xl font-bold">{instructors.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Verified</p>
            <p className="text-3xl font-bold text-green-600">
              {instructors.filter(i => i.is_verified).length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              {instructors.filter(i => !i.is_verified).length}
            </p>
          </div>
        </div>

        {/* Instructors Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInstructors.map((instructor) => (
                  <tr key={instructor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {instructor.name?.charAt(0).toUpperCase() || 'I'}
                        </div>
                        <div>
                          <p className="font-semibold">{instructor.name}</p>
                          <p className="text-sm text-gray-500">{instructor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>{instructor.followers?.[0]?.count || 0} followers</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>{instructor.courses?.[0]?.count || 0} courses</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {instructor.is_verified ? (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center space-x-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs font-bold rounded-full w-fit">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleVerification(instructor.id, instructor.is_verified)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          instructor.is_verified
                            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200'
                            : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200'
                        }`}
                      >
                        {instructor.is_verified ? (
                          <>
                            <XCircle className="h-4 w-4 inline mr-1" />
                            Remove Verification
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 inline mr-1" />
                            Verify Instructor
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInstructors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No instructors found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
