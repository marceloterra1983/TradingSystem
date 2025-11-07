import { useState, useEffect } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from './ui/collapsible-card';
import { Button } from './ui/button';
import { Plus, BookOpen, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { api, Course } from '../services/api';

export function CoursesSection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
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
      password: course.password || '',
    });
    setEditingId(course.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', baseUrl: '', username: '', password: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const togglePasswordVisibility = (courseId: string) => {
    setShowPassword((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
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
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
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
                      <span className="flex items-center gap-1">
                        Password:{' '}
                        {showPassword[course.id] ? (course.password || '••••••••••') : '••••••••••'}
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
                    </div>
                  </div>
                  <div className="flex gap-2">
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
