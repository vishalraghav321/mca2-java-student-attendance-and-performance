import { useEffect, useState } from 'react'
import Layout from '../components/common/Layout'
import { adminService, courseService, authService } from '../services/api'
import { Users, BookOpen, GraduationCap, Plus, Trash2, UserPlus, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  required,
  validateFullName,
  validateEmail,
  validatePassword,
  validateRollNumber,
  validateSemester,
  validateInteger,
  validateCourseCode,
  validateDuplicate,
} from '../utils/validation'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="text-white" size={26} />
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

const fieldClass = (error) =>
  `mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
    error ? 'border-red-500' : 'border-gray-200'
  }`

function DashboardHome() {
  const [stats, setStats] = useState({})
  useEffect(() => { adminService.dashboard().then(r => setStats(r.data)) }, [])
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={GraduationCap} label="Total Students" value={stats.totalStudents ?? '-'} color="bg-blue-500" />
        <StatCard icon={Users} label="Total Faculty" value={stats.totalFaculty ?? '-'} color="bg-green-500" />
        <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses ?? '-'} color="bg-purple-500" />
      </div>
    </div>
  )
}

function StudentsPanel() {
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', rollNumber: '', branch: '', semester: '' })
  const [enrollData, setEnrollData] = useState({ studentId: '', courseId: '' })
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [errors, setErrors] = useState({})
  const [enrollErrors, setEnrollErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [enrollTouched, setEnrollTouched] = useState({})
  const [saving, setSaving] = useState(false)
  const [enrolledIds, setEnrolledIds] = useState([])

  const load = () => {
    adminService.getStudents().then(r => setStudents(r.data))
    courseService.getAll().then(r => setCourses(r.data))
  }
  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const nextErrors = {
      name: validateFullName(form.name),
      email: validateEmail(form.email) || validateDuplicate(form.email, students, s => s.email, 'Email'),
      password: validatePassword(form.password),
      rollNumber: validateRollNumber(form.rollNumber) || validateDuplicate(form.rollNumber, students, s => s.rollNumber, 'Roll number'),
      branch: required(form.branch, 'Branch'),
      semester: validateSemester(form.semester),
    }
    setTouched({ name: true, email: true, password: true, rollNumber: true, branch: true, semester: true })
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean) || saving) return
    setSaving(true)
    setMsg('')
    try {
      await authService.register({ ...form, role: 'STUDENT', semester: Number(form.semester) })
      setMsg('Student added!')
      setMsgType('success')
      load(); setShowAdd(false); setErrors({})
      setForm({ name: '', email: '', password: '', rollNumber: '', branch: '', semester: '' })
    } catch {
      setMsg('Error adding student')
      setMsgType('error')
    } finally {
      setSaving(false)
    }
  }

  const handleEnroll = async (e) => {
    e.preventDefault()
    const nextErrors = {
      studentId: required(enrollData.studentId, 'Student'),
      courseId: required(enrollData.courseId, 'Course'),
    }
    if (!nextErrors.studentId && !nextErrors.courseId && enrolledIds.includes(Number(enrollData.studentId))) {
      nextErrors.studentId = 'Student is already enrolled in this course'
    }
    setEnrollTouched({ studentId: true, courseId: true })
    setEnrollErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean) || saving) return
    setSaving(true)
    setMsg('')
    try {
      await adminService.enroll(Number(enrollData.studentId), Number(enrollData.courseId))
      setMsg('Student successfully enrolled in course!')
      setMsgType('success')
      setShowEnroll(false)
      setEnrollData({ studentId: '', courseId: '' })
      setEnrollErrors({})
    } catch {
      setMsg('Error enrolling student')
      setMsgType('error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return
    await adminService.deleteStudent(id); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Students ({students.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => { setShowEnroll(!showEnroll); setShowAdd(false) }} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            <UserPlus size={16} /> Enroll in Course
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setShowEnroll(false) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      {msg && <p className={`mb-4 text-sm p-3 rounded-lg ${msgType === 'error' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>{msg}</p>}

      {showEnroll && (
        <form onSubmit={handleEnroll} className="bg-white p-6 rounded-2xl shadow-sm mb-6 grid grid-cols-2 gap-4 border border-purple-100">
          <div className="col-span-2">
            <h3 className="font-semibold text-gray-800 text-sm">Enroll Student in Course</h3>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Select Student</label>
            <select value={enrollData.studentId} onChange={e => {
              const value = e.target.value
              setEnrollData({...enrollData, studentId: value})
              if (enrollTouched.studentId) setEnrollErrors(prev => ({
                ...prev,
                studentId: required(value, 'Student') || (enrollData.courseId && enrolledIds.includes(Number(value)) ? 'Student is already enrolled in this course' : '')
              }))
            }} onBlur={() => setEnrollTouched(prev => ({...prev, studentId: true}))} required
              className={`${fieldClass(enrollTouched.studentId && enrollErrors.studentId)} focus:ring-purple-400`}>
              <option value="">-- Choose Student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber || s.email})</option>)}
            </select>
            {enrollTouched.studentId && enrollErrors.studentId && <p className="mt-1 text-xs text-red-600">{enrollErrors.studentId}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Select Course</label>
            <select value={enrollData.courseId} onChange={e => {
              const value = e.target.value
              setEnrollData({...enrollData, courseId: value})
              setEnrolledIds([])
              if (value) courseService.getCourseStudents(value).then(r => setEnrolledIds(r.data.map(s => Number(s.id))))
              if (enrollTouched.courseId) setEnrollErrors(prev => ({...prev, courseId: required(value, 'Course')}))
            }} onBlur={() => setEnrollTouched(prev => ({...prev, courseId: true}))} required
              className={`${fieldClass(enrollTouched.courseId && enrollErrors.courseId)} focus:ring-purple-400`}>
              <option value="">-- Choose Course --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
            {enrollTouched.courseId && enrollErrors.courseId && <p className="mt-1 text-xs text-red-600">{enrollErrors.courseId}</p>}
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">{saving ? 'Enrolling...' : 'Enroll'}</button>
            <button type="button" onClick={() => setShowEnroll(false)} className="border px-6 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm mb-6 grid grid-cols-2 gap-4">
          {[['name','Full Name','text'],['email','Email','email'],['password','Password','password'],['rollNumber','Roll Number','text'],['branch','Branch','text'],['semester','Semester','number']].map(([key,label,type]) => {
            const validate = (value) => {
              if (key === 'name') return validateFullName(value)
              if (key === 'email') return validateEmail(value) || validateDuplicate(value, students, s => s.email, 'Email')
              if (key === 'password') return validatePassword(value)
              if (key === 'rollNumber') return validateRollNumber(value) || validateDuplicate(value, students, s => s.rollNumber, 'Roll number')
              if (key === 'branch') return required(value, 'Branch')
              if (key === 'semester') return validateSemester(value)
              return ''
            }
            return (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600">{label}</label>
                <input type={type} value={form[key]}
                  min={key === 'semester' ? 1 : undefined} max={key === 'semester' ? 8 : undefined}
                  step={key === 'semester' ? 1 : undefined} inputMode={key === 'semester' ? 'numeric' : undefined}
                  maxLength={key === 'name' ? 50 : key === 'rollNumber' ? 30 : undefined}
                  onChange={e => {
                    const value = e.target.value
                    setForm({...form, [key]: value})
                    if (touched[key]) setErrors(prev => ({...prev, [key]: validate(value)}))
                  }}
                  onBlur={() => { setTouched(prev => ({...prev, [key]: true})); setErrors(prev => ({...prev, [key]: validate(form[key])})) }}
                  required className={fieldClass(touched[key] && errors[key])} />
                {touched[key] && errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
              </div>
            )
          })}
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="border px-6 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>{['Name','Email','Roll No.','Branch','Sem','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-gray-500">{s.email}</td>
                <td className="px-4 py-3">{s.rollNumber || '—'}</td>
                <td className="px-4 py-3">{s.branch || '—'}</td>
                <td className="px-4 py-3">{s.semester || '—'}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <button onClick={() => { setEnrollData({ studentId: String(s.id), courseId: '' }); setShowEnroll(true); setShowAdd(false) }} title="Enroll in Course" className="text-purple-600 hover:text-purple-800 p-1 rounded">
                    <UserPlus size={16} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} title="Delete Student" className="text-red-500 hover:text-red-700 p-1 rounded">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CoursesPanel() {
  const [courses, setCourses] = useState([])
  const [faculty, setFaculty] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', description: '', credits: '', semester: '', facultyId: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [saving, setSaving] = useState(false)

  const load = () => courseService.getAll().then(r => setCourses(r.data))
  useEffect(() => {
    load()
    adminService.getFaculty().then(r => setFaculty(r.data))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const nextErrors = {
      code: validateCourseCode(form.code) || validateDuplicate(form.code, courses, c => c.code, 'Course code'),
      name: required(form.name, 'Course name') || (form.name.trim().length < 3 || form.name.trim().length > 100 ? 'Course name must be between 3 and 100 characters' : ''),
      description: form.description.length > 500 ? 'Description must be 500 characters or fewer' : '',
      credits: validateInteger(form.credits, 'Credits', 1, 6),
      semester: validateSemester(form.semester),
      facultyId: required(form.facultyId, 'Faculty'),
    }
    setTouched({ code: true, name: true, description: true, credits: true, semester: true, facultyId: true })
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean) || saving) return
    setSaving(true)
    setMsg('')
    try {
      await courseService.create({ ...form, credits: Number(form.credits), semester: Number(form.semester), facultyId: Number(form.facultyId) })
      setMsg('Course added!')
      setMsgType('success')
      load(); setShowAdd(false); setErrors({})
      setForm({ code: '', name: '', description: '', credits: '', semester: '', facultyId: '' })
    } catch {
      setMsg('Error adding course')
      setMsgType('error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete course?')) return
    await courseService.delete(id); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Courses ({courses.length})</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16} /> Add Course
        </button>
      </div>

      {msg && <p className={`mb-4 text-sm p-3 rounded-lg ${msgType === 'error' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>{msg}</p>}

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm mb-6 grid grid-cols-2 gap-4">
          {[['code','Course Code','text'],['name','Course Name','text'],['description','Description','textarea'],['credits','Credits','number'],['semester','Semester','number']].map(([key,label,type]) => {
            const validate = (value) => {
              if (key === 'code') return validateCourseCode(value) || validateDuplicate(value, courses, c => c.code, 'Course code')
              if (key === 'name') return required(value, 'Course name') || (value.trim().length < 3 || value.trim().length > 100 ? 'Course name must be between 3 and 100 characters' : '')
              if (key === 'description') return value.length > 500 ? 'Description must be 500 characters or fewer' : ''
              if (key === 'credits') return validateInteger(value, 'Credits', 1, 6)
              if (key === 'semester') return validateSemester(value)
              return ''
            }
            return (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600">{label}</label>
                {type === 'textarea' ? (
                  <textarea value={form[key]} maxLength={500}
                    onChange={e => { const value = e.target.value; setForm({...form,[key]:value}); if (touched[key]) setErrors(prev => ({...prev,[key]:validate(value)})) }}
                    onBlur={() => { setTouched(prev => ({...prev,[key]:true})); setErrors(prev => ({...prev,[key]:validate(form[key])})) }}
                    className={`${fieldClass(touched[key] && errors[key])} min-h-20`} />
                ) : (
                  <input type={type} value={form[key]} maxLength={key === 'code' ? 20 : key === 'name' ? 100 : undefined}
                    min={key === 'credits' ? 1 : key === 'semester' ? 1 : undefined}
                    max={key === 'credits' ? 6 : key === 'semester' ? 8 : undefined}
                    step={type === 'number' ? 1 : undefined} inputMode={type === 'number' ? 'numeric' : undefined}
                    onChange={e => { const value = e.target.value; setForm({...form,[key]:value}); if (touched[key]) setErrors(prev => ({...prev,[key]:validate(value)})) }}
                    onBlur={() => { setTouched(prev => ({...prev,[key]:true})); setErrors(prev => ({...prev,[key]:validate(form[key])})) }}
                    required className={fieldClass(touched[key] && errors[key])} />
                )}
                {touched[key] && errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
              </div>
            )
          })}
          <div>
            <label className="text-xs font-medium text-gray-600">Assign Faculty</label>
            <select value={form.facultyId} onChange={e => { const value=e.target.value; setForm({...form, facultyId:value}); if(touched.facultyId) setErrors(prev=>({...prev,facultyId:required(value,'Faculty')})) }}
              onBlur={() => { setTouched(prev=>({...prev,facultyId:true})); setErrors(prev=>({...prev,facultyId:required(form.facultyId,'Faculty')})) }}
              required className={fieldClass(touched.facultyId && errors.facultyId)}>
              <option value="">Select Faculty</option>
              {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {touched.facultyId && errors.facultyId && <p className="mt-1 text-xs text-red-600">{errors.facultyId}</p>}
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="border px-6 py-2 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(c => (
          <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg">{c.code}</span>
                <h3 className="font-semibold text-gray-900 mt-2">{c.name}</h3>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">{c.description}</p>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>{c.credits} credits</span>
              <span>•</span>
              <span>Sem {c.semester}</span>
              <span>•</span>
              <span>{c.studentCount} students</span>
            </div>
            {c.facultyName && <p className="text-xs text-blue-600 mt-2 font-medium">By {c.facultyName}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: <DashboardHome /> },
    { id: 'students', label: 'Students', icon: GraduationCap, component: <StudentsPanel /> },
    { id: 'courses', label: 'Courses', icon: BookOpen, component: <CoursesPanel /> },
    { id: 'faculty', label: 'Faculty', icon: Users, component: <FacultyList /> },
  ]
  return <Layout navItems={navItems} role="ADMIN" />
}

function FacultyList() {
  const [faculty, setFaculty] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', designation: '' })
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [saving, setSaving] = useState(false)
  const load = () => adminService.getFaculty().then(r => setFaculty(r.data))
  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const nextErrors = {
      name: validateFullName(form.name),
      email: validateEmail(form.email) || validateDuplicate(form.email, faculty, f => f.email, 'Email'),
      password: validatePassword(form.password),
      department: required(form.department, 'Department'),
      designation: required(form.designation, 'Designation'),
    }
    setTouched({ name: true, email: true, password: true, department: true, designation: true })
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean) || saving) return
    setSaving(true)
    setMsg('')
    try {
      await authService.register({ ...form, role: 'FACULTY' })
      setMsg('Faculty added!')
      setMsgType('success')
      setForm({ name: '', email: '', password: '', department: '', designation: '' })
      setShowAdd(false); setErrors({})
      load()
    } catch {
      setMsg('Error adding faculty')
      setMsgType('error')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Faculty ({faculty.length})</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> Add Faculty
        </button>
      </div>
      {msg && <p className={`mb-4 text-sm p-3 rounded-lg ${msgType === 'error' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>{msg}</p>}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm mb-6 grid grid-cols-2 gap-4">
          {[['name','Full Name','text'],['email','Email','email'],['password','Password','password'],['department','Department','text'],['designation','Designation','text']].map(([key,label,type]) => {
            const validate = (value) => {
              if (key === 'name') return validateFullName(value)
              if (key === 'email') return validateEmail(value) || validateDuplicate(value, faculty, f => f.email, 'Email')
              if (key === 'password') return validatePassword(value)
              if (key === 'department') return required(value, 'Department')
              if (key === 'designation') return required(value, 'Designation')
              return ''
            }
            return (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600">{label}</label>
                <input type={type} value={form[key]} maxLength={key === 'name' ? 50 : undefined}
                  onChange={e => { const value=e.target.value; setForm({...form,[key]:value}); if(touched[key]) setErrors(prev=>({...prev,[key]:validate(value)})) }}
                  onBlur={() => { setTouched(prev=>({...prev,[key]:true})); setErrors(prev=>({...prev,[key]:validate(form[key])})) }}
                  required className={fieldClass(touched[key] && errors[key])} />
                {touched[key] && errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
              </div>
            )
          })}
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="border px-6 py-2 rounded-xl text-sm">Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>{['Name','Email','Department','Designation'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {faculty.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{f.name}</td>
                <td className="px-4 py-3 text-gray-500">{f.email}</td>
                <td className="px-4 py-3">{f.department || '—'}</td>
                <td className="px-4 py-3">{f.designation || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
