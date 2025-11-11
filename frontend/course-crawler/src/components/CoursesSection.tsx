import { useState, useEffect } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from './ui/collapsible-card';
import { Button } from './ui/button';
import { Plus, BookOpen, Edit2, Trash2, Eye, EyeOff, Play } from 'lucide-react';
import { api, Course } from '../services/api';

export function CoursesSection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [passwords, setPasswords] = useState<{ [key: string]: string }>({}); // Store fetched passwords
  const [showFormPassword, setShowFormPassword] = useState(false); // Toggle for form password visibility
  const [schedulingIds, setSchedulingIds] = useState<Set<string>>(new Set()); // Track scheduling runs
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await api.getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateCourse(editingId, formData);
      } else {
        await api.createCourse(formData);
      }
      resetForm();
      loadCourses();
    } catch (error) {
      console.error('Failed to save course:', error);
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.deleteCourse(courseId);
      loadCourses();
    } catch (error) {
      console.error('Failed to delete course:', error);
    }
  };

  const handleEdit = (course: Course) => {
    setFormData({
      name: course.name,
      baseUrl: course.baseUrl,
      username: course.username,
      password: '', // Leave empty - only update if user enters new password
    });
    setEditingId(course.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', baseUrl: '', username: '', password: '' });
    setEditingId(null);
    setShowForm(false);
    setShowFormPassword(false); // Reset password visibility
  };

  const togglePasswordVisibility = async (courseId: string) => {
    // If showing password and not yet fetched, fetch it first
    if (!showPassword[courseId] && !passwords[courseId]) {
      try {
        const password = await api.getCoursePassword(courseId);
        setPasswords((prev) => ({ ...prev, [courseId]: password }));
      } catch (error) {
        console.error('Failed to fetch password:', error);
        return;
      }
    }
    setShowPassword((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const handleScheduleRun = async (courseId: string) => {
    try {
      setSchedulingIds(prev => new Set(prev).add(courseId));
      await api.scheduleRun(courseId);
      alert('Run scheduled successfully! Check the Runs section below.');

      // Scroll to runs section
      const runsCard = document.getElementById('course-crawler-runs');
      if (runsCard) {
        runsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.error('Failed to schedule run:', error);
      alert('Failed to schedule run. See console for details.');
    } finally {
      setSchedulingIds(prev => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    }
  };

  return (
    <CollapsibleCard defaultCollapsed={false} cardId="course-crawler-courses">
      <CollapsibleCardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-500" />
            <div>
              <CollapsibleCardTitle>Courses</CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Manage course credentials for automated scraping
              </CollapsibleCardDescription>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Course
          </Button>
        </div>
      </CollapsibleCardHeader>

      <CollapsibleCardContent>
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Course' : 'New Course'}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                  placeholder="e.g., MQL5 do Zero"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base URL
                </label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                  placeholder="https://dqlabs.memberkit.com.br/230925-mql5-do-zero"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username <span className="text-xs text-gray-500">(optional - for public courses)</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Leave empty for public courses"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password <span className="text-xs text-gray-500">(optional - for public courses)</span>
                </label>
                <div className="relative">
                  <input
                    type={showFormPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder={editingId ? "Leave empty to keep current password" : "Leave empty if not required"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showFormPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" onClick={resetForm} variant="outline" size="sm">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No courses yet. Click "New Course" to add one.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {course.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {course.baseUrl}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Username: {course.username}</span>
                      {course.hasPassword ? (
                        <span className="flex items-center gap-1">
                          Password:{' '}
                          {showPassword[course.id] ? (passwords[course.id] || 'Loading...') : '••••••••••'}
                          <button
                            onClick={() => togglePasswordVisibility(course.id)}
                            className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                          >
                            {showPassword[course.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </button>
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">No password required</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleScheduleRun(course.id)}
                      size="sm"
                      disabled={schedulingIds.has(course.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {schedulingIds.has(course.id) ? 'Scheduling...' : 'Run'}
                    </Button>
                    <Button
                      onClick={() => handleEdit(course)}
                      size="sm"
                      variant="outline"
                      className="border-cyan-500 text-cyan-600 hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-400"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(course.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
