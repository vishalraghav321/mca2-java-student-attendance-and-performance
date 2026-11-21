import { useEffect, useState } from 'react'
import Layout from '../components/common/Layout'
import { courseService, attendanceService, marksService } from '../services/api'
import { BookOpen, ClipboardList, BarChart2, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { required, validateDate, validateMarks, validateInteger } from '../utils/validation'

function FacultyHome({ courses }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">My Courses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(c => (
          <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-500">
            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">{c.code}</span>
            <h3 className="font-semibold text-gray-900 mt-2 mb-1">{c.name}</h3>
            <p className="text-xs text-gray-500 mb-3">{c.description}</p>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{c.credits} credits</span>
              <span>•</span>
              <span>Sem {c.semester}</span>
              <span>•</span>
              <span className="text-green-600 font-medium">{c.studentCount} students</span>
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <p className="text-gray-400 text-sm col-span-3">No courses assigned yet.</p>
        )}
      </div>
    </div>
  )
}

function AttendancePanel({ courses }) {
  const todayValue = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }
  const normalizeDate = (value) => {
    if (typeof value === 'string') return value.slice(0, 10)
    if (Array.isArray(value) && value.length >= 3) {
      return `${value[0]}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')}`
    }
    return ''
  }
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState([])
  const [date, setDate] = useState(todayValue())
  const [attendance, setAttendance] = useState({}) // { studentId: 'PRESENT'|'ABSENT'|'LATE' }
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [existingAttendance, setExistingAttendance] = useState([])

  useEffect(() => {
    if (!selectedCourse) return
    courseService.getCourseStudents(selectedCourse)
      .then(res => {
        const studentList = res.data.length > 0 ? res.data : []
        setStudents(studentList)
        const init = {}
        studentList.forEach(s => { init[s.id] = 'PRESENT' })
        setAttendance(init)
      })
      .catch(() => {
        setStudents([])
        setAttendance({})
      })

    if (selectedCourse && date) {
      attendanceService.getByCourse(selectedCourse)
        .then(res => {
          setExistingAttendance(res.data)
          const existing = res.data.filter(a => normalizeDate(a.date) === date)
          setAttendance(prev => {
            const next = { ...prev }
            existing.forEach(a => {
              if (a.studentId != null) next[a.studentId] = a.status
            })
            return next
          })
        })
        .catch(() => {})
    }
  }, [selectedCourse, date])

  const handleSubmit = async () => {
    const nextErrors = {
      course: required(selectedCourse, 'Course'),
      date: validateDate(date, { allowFuture: false }),
    }
    const duplicate = existingAttendance.some(a =>
      String(a.courseId) === String(selectedCourse) && normalizeDate(a.date) === date
    )
    if (!nextErrors.course && !nextErrors.date && duplicate) {
      nextErrors.date = 'Attendance already exists for this course and date'
    }
    const missingStatus = students.find(s => !['PRESENT','ABSENT','LATE'].includes(attendance[s.id]))
    if (students.length > 0 && missingStatus) nextErrors.attendance = 'Each student must have exactly one attendance status'
    setTouched({ course: true, date: true, attendance: true })
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean) || saving) return
    setSaving(true)
    setMsg('')
    try {
      const attendanceMap = {}
      students.forEach(s => { attendanceMap[s.id] = attendance[s.id] || 'ABSENT' })
      await attendanceService.markBulk({
        courseId: Number(selectedCourse),
        date,
        attendance: attendanceMap
      })
      setMsg('Attendance saved successfully!')
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error saving attendance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Mark Attendance</h2>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Select Course</label>
            <select value={selectedCourse} onChange={e => { const value=e.target.value; setSelectedCourse(value); if(touched.course) setErrors(prev=>({...prev,course:required(value,'Course')})) }}
              onBlur={() => { setTouched(prev=>({...prev,course:true})); setErrors(prev=>({...prev,course:required(selectedCourse,'Course')})) }}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${touched.course&&errors.course?'border-red-500':'border-gray-200'}`}>
              <option value="">-- Select Course --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
            {touched.course && errors.course && <p className="mt-1 text-xs text-red-600">{errors.course}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
            <input type="date" value={date} max={todayValue()}
              onChange={e => { const value=e.target.value; setDate(value); if(touched.date) setErrors(prev=>({...prev,date:validateDate(value,{allowFuture:false})})) }}
              onBlur={() => { setTouched(prev=>({...prev,date:true})); setErrors(prev=>({...prev,date:validateDate(date,{allowFuture:false})})) }}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${touched.date&&errors.date?'border-red-500':'border-gray-200'}`} />
            {touched.date && errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
          </div>
        </div>

        {msg && <p className={`text-sm p-3 rounded-lg mb-4 ${msg.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{msg}</p>}

        {students.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Roll No.</th>
                    {['PRESENT','ABSENT','LATE'].map(s => (
                      <th key={s} className="px-4 py-3 text-center">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-gray-500">{s.rollNumber || '—'}</td>
                      {['PRESENT','ABSENT','LATE'].map(status => (
                        <td key={status} className="px-4 py-3 text-center">
                          <input type="radio" name={`att-${s.id}`} value={status}
                            checked={attendance[s.id] === status}
                            onChange={() => setAttendance(prev => ({...prev, [s.id]: status}))}
                            className="accent-green-500 w-4 h-4" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {touched.attendance && errors.attendance && <p className="mt-2 text-xs text-red-600">{errors.attendance}</p>}
            <button onClick={handleSubmit} disabled={saving}
              className="mt-4 bg-green-600 text-white px-8 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </>
        )}

        {selectedCourse && students.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No students found.</p>
        )}

        {!selectedCourse && (
          <p className="text-gray-400 text-sm text-center py-8">Select a course to mark attendance.</p>
        )}
      </div>
    </div>
  )
}

function MarksPanel({ courses }) {
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState([])
  const [examType, setExamType] = useState('MIDTERM')
  const [totalMarks, setTotalMarks] = useState(100)
  const [marks, setMarks] = useState({}) // { studentId: marksObtained }
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [existingMarks, setExistingMarks] = useState([])
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  useEffect(() => {
    if (!selectedCourse) return
    courseService.getCourseStudents(selectedCourse)
      .then(res => {
        const studentList = res.data.length > 0 ? res.data : []
        setStudents(studentList)
        const init = {}
        studentList.forEach(s => { init[s.id] = '' })
        setMarks(init)
      })
      .catch(() => {
        setStudents([])
        setMarks({})
      })
    marksService.getByCourse(selectedCourse).then(r => setExistingMarks(r.data))
  }, [selectedCourse])

  const handleSubmit = async () => {
    const nextErrors = {
      course: required(selectedCourse, 'Course'),
      examType: required(examType, 'Exam type') || (!['MIDTERM','FINAL','ASSIGNMENT','QUIZ'].includes(examType) ? 'Select a valid exam type' : ''),
      totalMarks: validateInteger(totalMarks, 'Total marks', 1),
    }
    if (!nextErrors.totalMarks && Number(totalMarks) <= 0) nextErrors.totalMarks = 'Total marks must be greater than zero'
    const studentErrors = {}
    if (students.length === 0 && selectedCourse) studentErrors.marks = 'No students are available for this course'
    students.forEach(s => {
      const value = marks[s.id]
      const message = validateMarks(value, totalMarks)
      if (message) studentErrors[s.id] = message
    })
    setTouched({ course: true, examType: true, totalMarks: true, marks: true })
    setErrors({...nextErrors, ...studentErrors})
    if (Object.values({...nextErrors, ...studentErrors}).some(Boolean) || saving) return
    setSaving(true); setMsg('')
    try {
      await Promise.all(
        students
          .filter(s => marks[s.id] !== '')
          .map(s =>
            marksService.upload({
              studentId: s.id,
              courseId: Number(selectedCourse),
              examType,
              marksObtained: Number(marks[s.id]),
              totalMarks: Number(totalMarks)
            })
          )
      )
      setMsg('Marks uploaded successfully!')
      marksService.getByCourse(selectedCourse).then(r => setExistingMarks(r.data))
    } catch {
      setMsg('Error uploading marks.')
    } finally {
      setSaving(false)
    }
  }

  const gradeColor = { 'A+': 'text-emerald-600', A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-orange-500', F: 'text-red-600' }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Upload Marks</h2>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Course</label>
            <select value={selectedCourse} onChange={e => { const value=e.target.value; setSelectedCourse(value); if(touched.course) setErrors(prev=>({...prev,course:required(value,'Course')})) }}
              onBlur={() => { setTouched(prev=>({...prev,course:true})); setErrors(prev=>({...prev,course:required(selectedCourse,'Course')})) }}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${touched.course&&errors.course?'border-red-500':'border-gray-200'}`}>
              <option value="">-- Select Course --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
            {touched.course && errors.course && <p className="mt-1 text-xs text-red-600">{errors.course}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Exam Type</label>
            <select value={examType} onChange={e => { const value=e.target.value; setExamType(value); if(touched.examType) setErrors(prev=>({...prev,examType:required(value,'Exam type')})) }}
              onBlur={() => { setTouched(prev=>({...prev,examType:true})); setErrors(prev=>({...prev,examType:required(examType,'Exam type')})) }}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${touched.examType&&errors.examType?'border-red-500':'border-gray-200'}`}>
              {['MIDTERM','FINAL','ASSIGNMENT','QUIZ'].map(t => <option key={t}>{t}</option>)}
            </select>
            {touched.examType && errors.examType && <p className="mt-1 text-xs text-red-600">{errors.examType}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Total Marks</label>
            <input type="number" value={totalMarks} min="1" step="1" inputMode="numeric"
              onChange={e => { const value=e.target.value; setTotalMarks(value); if(touched.totalMarks) setErrors(prev=>({...prev,totalMarks:validateInteger(value,'Total marks',1)})) }}
              onBlur={() => { setTouched(prev=>({...prev,totalMarks:true})); setErrors(prev=>({...prev,totalMarks:validateInteger(totalMarks,'Total marks',1)})) }}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${touched.totalMarks&&errors.totalMarks?'border-red-500':'border-gray-200'}`} />
            {touched.totalMarks && errors.totalMarks && <p className="mt-1 text-xs text-red-600">{errors.totalMarks}</p>}
          </div>
        </div>

        {msg && <p className={`text-sm p-3 rounded-lg mb-4 ${msg.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{msg}</p>}

        {students.length > 0 && (
          <>
            <table className="w-full text-sm mb-4">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Roll No.</th>
                  <th className="px-4 py-3 text-left">Marks (out of {totalMarks})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.rollNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" max={totalMarks} step="any" inputMode="decimal" value={marks[s.id]}
                        onChange={e => {
                          const value=e.target.value
                          setMarks(prev => ({...prev, [s.id]: value}))
                          if (touched.marks) setErrors(prev => ({...prev,[s.id]:validateMarks(value,totalMarks)}))
                        }}
                        onBlur={() => {
                          setTouched(prev => ({...prev,marks:true}))
                          setErrors(prev => ({...prev,[s.id]:validateMarks(marks[s.id],totalMarks)}))
                        }}
                        placeholder="—"
                        className={`border rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-green-400 ${touched.marks&&errors[s.id]?'border-red-500':'border-gray-200'}`} />
                      {touched.marks && errors[s.id] && <p className="mt-1 text-xs text-red-600">{errors[s.id]}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleSubmit} disabled={saving}
              className="bg-green-600 text-white px-8 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Uploading...' : 'Upload Marks'}
            </button>
          </>
        )}

        {!selectedCourse && <p className="text-gray-400 text-sm text-center py-8">Select a course to upload marks.</p>}
      </div>

      {/* Existing marks table */}
      {existingMarks.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Marks History</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Student','Exam','Marks','Total','Grade','%'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {existingMarks.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.studentName}</td>
                  <td className="px-4 py-3"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{m.examType}</span></td>
                  <td className="px-4 py-3">{m.marksObtained}</td>
                  <td className="px-4 py-3">{m.totalMarks}</td>
                  <td className={`px-4 py-3 font-bold ${gradeColor[m.grade] || ''}`}>{m.grade}</td>
                  <td className="px-4 py-3">{m.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function FacultyDashboard() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])

  useEffect(() => {
    if (user?.userId) {
      courseService.getFacultyCourses(user.userId).then(r => setCourses(r.data))
    }
  }, [user])

  const navItems = [
    { id: 'home', label: 'My Courses', icon: LayoutDashboard, component: <FacultyHome courses={courses} /> },
    { id: 'attendance', label: 'Attendance', icon: ClipboardList, component: <AttendancePanel courses={courses} /> },
    { id: 'marks', label: 'Upload Marks', icon: BarChart2, component: <MarksPanel courses={courses} /> },
  ]

  return <Layout navItems={navItems} role="FACULTY" />
}
