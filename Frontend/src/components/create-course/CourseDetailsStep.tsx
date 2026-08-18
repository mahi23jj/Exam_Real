import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Lock } from 'lucide-react';

export interface CourseDetailsData {
  name: string;
  description: string;
  department: string;
  visibility: 'public' | 'private';
}

interface CourseDetailsStepProps {
  data: CourseDetailsData;
  onChange: (data: CourseDetailsData) => void;
  onNext: () => void;
  onCancel: () => void;
}

const DEPARTMENTS = [
  'Computer Science', 'Software Engineering', 'Information Technology',
  'Data Science', 'Electrical Engineering', 'Mechanical Engineering',
  'Business Administration', 'Economics', 'Mathematics', 'Physics',
  'Chemistry', 'Biology', 'Other'
];

const CourseDetailsStep: React.FC<CourseDetailsStepProps> = ({ data, onChange, onNext, onCancel }) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Please enter a course name';
        if (value.length < 3) return 'Course name must be at least 3 characters';
        if (value.length > 100) return 'Course name must be less than 100 characters';
        return '';
      case 'description':
        if (!value.trim()) return 'Please enter a description';
        if (value.length < 10) return 'Description must be at least 10 characters';
        if (value.length > 500) return 'Description must be less than 500 characters';
        return '';
      case 'department':
        if (!value) return 'Please select a department';
        return '';
      default:
        return '';
    }
  };

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    if (touched.name) newErrors.name = validate('name', data.name);
    if (touched.description) newErrors.description = validate('description', data.description);
    if (touched.department) newErrors.department = validate('department', data.department);
    setErrors(newErrors);
  }, [data, touched]);

  const handleBlur = (field: keyof CourseDetailsData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleNext = () => {
    // Validate all fields
    const nameError = validate('name', data.name);
    const descError = validate('description', data.description);
    const deptError = validate('department', data.department);

    if (nameError || descError || deptError) {
      setTouched({ name: true, description: true, department: true });
      return;
    }

    onNext();
  };

  const getBorderClass = (field: keyof CourseDetailsData) => {
    if (!touched[field]) return 'border-stone-200 focus:border-teal-600 focus:shadow-[0_0_0_2px_rgba(15,118,110,0.1)]';
    if (errors[field]) return 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.1)]';
    return 'border-emerald-500 focus:border-emerald-600 focus:shadow-[0_0_0_2px_rgba(16,185,129,0.1)]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div>
        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Course Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          onBlur={() => handleBlur('name')}
          placeholder="e.g. Advanced Algorithms"
          className={`w-full px-4 py-3 bg-stone-50 border rounded-2xl text-sm transition-all outline-none ${getBorderClass('name')}`}
        />
        {touched.name && errors.name && (
          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs mt-1.5 ml-1">
            {errors.name}
          </motion.p>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          onBlur={() => handleBlur('description')}
          placeholder="What will students learn in this course?"
          rows={3}
          className={`w-full px-4 py-3 bg-stone-50 border rounded-2xl text-sm transition-all outline-none resize-none ${getBorderClass('description')}`}
        />
        {touched.description && errors.description && (
          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs mt-1.5 ml-1">
            {errors.description}
          </motion.p>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Department</label>
        <select
          value={data.department}
          onChange={(e) => onChange({ ...data, department: e.target.value })}
          onBlur={() => handleBlur('department')}
          className={`w-full px-4 py-3 bg-stone-50 border rounded-2xl text-sm transition-all outline-none appearance-none ${getBorderClass('department')}`}
        >
          <option value="" disabled>Select a department</option>
          {DEPARTMENTS.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        {touched.department && errors.department && (
          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs mt-1.5 ml-1">
            {errors.department}
          </motion.p>
        )}
      </div>

      <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-2xl">
        <div className="flex items-center gap-3">
          {data.visibility === 'public' ? <Globe className="w-5 h-5 text-teal-600" /> : <Lock className="w-5 h-5 text-stone-400" />}
          <div>
            <div className="text-sm font-bold text-stone-800 capitalize">{data.visibility}</div>
            <div className="text-[10px] text-stone-500">{data.visibility === 'public' ? 'Anyone can join' : 'Invite only'}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...data, visibility: data.visibility === 'public' ? 'private' : 'public' })}
          className={`w-12 h-6 rounded-full transition-colors relative ${data.visibility === 'public' ? 'bg-teal-600' : 'bg-stone-300'}`}
        >
          <motion.div 
            animate={{ x: data.visibility === 'public' ? 26 : 4 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
          />
        </button>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleNext}
          className="flex-[2] py-4 bg-teal-700 text-white rounded-2xl text-sm font-bold hover:bg-teal-800 transition-all"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
};

export default CourseDetailsStep;
