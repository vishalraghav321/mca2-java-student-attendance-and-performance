const STORAGE_KEY = 'sms-demo-data'

const demoUsers = [
  { userId: 301, name: 'System Administrator', email: 'admin@sms.com', password: 'admin123', role: 'ADMIN' },
  { userId: 201, name: 'Dr. Sarah Johnson', email: 'faculty@sms.com', password: 'faculty123', role: 'FACULTY', department: 'Computer Science', designation: 'Professor' },
  { userId: 103, name: 'Alex Morgan', email: 'student@sms.com', password: 'student123', role: 'STUDENT', rollNumber: 'CS240103', branch: 'Computer Science', semester: 4 }
]

const seedData = {
  users: demoUsers,
  students: [
    { id: 103, name: 'Alex Morgan', email: 'student@sms.com', rollNumber: 'CS240103', branch: 'Computer Science', semester: 4 },
    { id: 104, name: 'Emma Wilson', email: 'emma.wilson@sms.com', rollNumber: 'CS240104', branch: 'Computer Science', semester: 4 },
    { id: 105, name: 'Liam Brown', email: 'liam.brown@sms.com', rollNumber: 'CS240105', branch: 'Computer Science', semester: 4 },
    { id: 106, name: 'Sophia Davis', email: 'sophia.davis@sms.com', rollNumber: 'CS240106', branch: 'Information Technology', semester: 4 },
    { id: 107, name: 'Noah Miller', email: 'noah.miller@sms.com', rollNumber: 'IT240107', branch: 'Information Technology', semester: 4 }
  ],
  faculty: [
    { id: 201, name: 'Dr. Sarah Johnson', email: 'faculty@sms.com', department: 'Computer Science', designation: 'Professor' },
    { id: 202, name: 'Prof. David Lee', email: 'david.lee@sms.com', department: 'Computer Science', designation: 'Associate Professor' },
    { id: 203, name: 'Dr. Priya Sharma', email: 'priya.sharma@sms.com', department: 'Information Technology', designation: 'Assistant Professor' }
  ],
  courses: [
    { id: 11, code: 'CS301', name: 'Data Structures', description: 'Arrays, linked lists, trees, graphs, and algorithms.', credits: 4, semester: 4, facultyId: 201, facultyName: 'Dr. Sarah Johnson', studentCount: 4 },
    { id: 12, code: 'CS302', name: 'Database Systems', description: 'Relational modeling, SQL, transactions, and normalization.', credits: 4, semester: 4, facultyId: 201, facultyName: 'Dr. Sarah Johnson', studentCount: 3 },
    { id: 13, code: 'CS303', name: 'Operating Systems', description: 'Processes, memory management, file systems, and scheduling.', credits: 3, semester: 4, facultyId: 202, facultyName: 'Prof. David Lee', studentCount: 3 },
    { id: 14, code: 'IT304', name: 'Computer Networks', description: 'Network layers, protocols, switching, and security.', credits: 3, semester: 4, facultyId: 203, facultyName: 'Dr. Priya Sharma', studentCount: 2 }
  ],
  enrollments: [
    { studentId: 103, courseId: 11 }, { studentId: 103, courseId: 12 }, { studentId: 103, courseId: 13 },
    { studentId: 104, courseId: 11 }, { studentId: 104, courseId: 12 }, { studentId: 104, courseId: 14 },
    { studentId: 105, courseId: 11 }, { studentId: 105, courseId: 13 }, { studentId: 105, courseId: 14 },
    { studentId: 106, courseId: 11 }, { studentId: 106, courseId: 12 }, { studentId: 106, courseId: 13 },
    { studentId: 107, courseId: 12 }, { studentId: 107, courseId: 14 }
  ],
  attendance: [],
  marks: []
}

const clone = value => JSON.parse(JSON.stringify(value))

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  const data = clone(seedData)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

let data = loadData()

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function response(payload) {
  return Promise.resolve({ data: payload })
}

function nextId(items) {
  return items.length ? Math.max(...items.map(item => Number(item.id) || 0)) + 1 : 1
}

function gradeFor(percentage) {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  return 'F'
}

function refreshCourseCounts() {
  data.courses.forEach(course => {
    course.studentCount = data.enrollments.filter(enrollment => enrollment.courseId === course.id).length
  })
}

function buildSampleRecords() {
  if (data.attendance.length === 0) {
    const dates = ['2026-10-06', '2026-10-09', '2026-10-13', '2026-10-16', '2026-10-20', '2026-10-23']
    data.enrollments.forEach((enrollment, index) => {
      const student = data.students.find(item => item.id === enrollment.studentId)
      const course = data.courses.find(item => item.id === enrollment.courseId)
      dates.forEach((date, dateIndex) => {
        let status = 'PRESENT'
        if ((index + dateIndex) % 9 === 7) status = 'ABSENT'
        if ((index + dateIndex) % 11 === 5) status = 'LATE'
        data.attendance.push({
          id: data.attendance.length + 1,
          studentId: student.id,
          studentName: student.name,
          courseId: course.id,
          courseName: course.name,
          date,
          status
        })
      })
    })
  }
  if (data.marks.length === 0) {
    const examTypes = [
      ['MIDTERM', 82], ['FINAL', 88], ['ASSIGNMENT', 94], ['QUIZ', 78]
    ]
    data.enrollments.forEach((enrollment, enrollmentIndex) => {
      const student = data.students.find(item => item.id === enrollment.studentId)
      const course = data.courses.find(item => item.id === enrollment.courseId)
      examTypes.forEach(([examType, base], examIndex) => {
        const marksObtained = Math.max(45, Math.min(100, base - ((enrollmentIndex + examIndex) % 4) * 3))
        data.marks.push({
          id: data.marks.length + 1,
          studentId: student.id,
          studentName: student.name,
          courseId: course.id,
          courseName: course.name,
          examType,
          marksObtained,
          totalMarks: 100,
          percentage: marksObtained,
          grade: gradeFor(marksObtained)
        })
      })
    })
  }
  refreshCourseCounts()
  save()
}

buildSampleRecords()

export const demoMode = String(import.meta.env.VITE_DEMO_MODE).toLowerCase() === 'true'

export const mockService = {
  login(email, password) {
    const user = data.users.find(item => item.email.toLowerCase() === String(email).toLowerCase() && item.password === password)
    if (!user) return Promise.reject(new Error('Invalid email or password'))
    const { password: _password, ...safeUser } = user
    return response({ token: `demo-token-${user.role.toLowerCase()}`, ...safeUser })
  },
  logout() {
    return response({ success: true })
  },
  register(payload) {
    const role = payload.role
    const id = role === 'STUDENT'
      ? nextId(data.students)
      : nextId(data.faculty)
    const user = { ...payload, userId: id, password: payload.password }
    data.users.push(user)
    if (role === 'STUDENT') {
      data.students.push({
        id,
        name: payload.name,
        email: payload.email,
        rollNumber: payload.rollNumber,
        branch: payload.branch,
        semester: Number(payload.semester)
      })
    } else if (role === 'FACULTY') {
      data.faculty.push({
        id,
        name: payload.name,
        email: payload.email,
        department: payload.department,
        designation: payload.designation
      })
    }
    save()
    return response({ id, message: `${role.toLowerCase()} added successfully` })
  },
  dashboard() {
    return response({
      totalStudents: data.students.length,
      totalFaculty: data.faculty.length,
      totalCourses: data.courses.length
    })
  },
  getStudents() { return response(clone(data.students)) },
  getFaculty() { return response(clone(data.faculty)) },
  deleteStudent(id) {
    data.students = data.students.filter(student => student.id !== Number(id))
    data.users = data.users.filter(user => user.userId !== Number(id))
    data.enrollments = data.enrollments.filter(enrollment => enrollment.studentId !== Number(id))
    data.attendance = data.attendance.filter(record => record.studentId !== Number(id))
    data.marks = data.marks.filter(record => record.studentId !== Number(id))
    refreshCourseCounts()
    save()
    return response({ success: true })
  },
  enroll(studentId, courseId) {
    studentId = Number(studentId)
    courseId = Number(courseId)
    if (!data.enrollments.some(item => item.studentId === studentId && item.courseId === courseId)) {
      data.enrollments.push({ studentId, courseId })
    }
    refreshCourseCounts()
    save()
    return response({ success: true })
  },
  getCourses() { return response(clone(data.courses)) },
  createCourse(payload) {
    const faculty = data.faculty.find(item => item.id === Number(payload.facultyId))
    const course = {
      id: nextId(data.courses),
      code: payload.code,
      name: payload.name,
      description: payload.description,
      credits: Number(payload.credits),
      semester: Number(payload.semester),
      facultyId: payload.facultyId ? Number(payload.facultyId) : null,
      facultyName: faculty?.name || null,
      studentCount: 0
    }
    data.courses.push(course)
    save()
    return response(course)
  },
  deleteCourse(id) {
    id = Number(id)
    data.courses = data.courses.filter(course => course.id !== id)
    data.enrollments = data.enrollments.filter(enrollment => enrollment.courseId !== id)
    data.attendance = data.attendance.filter(record => record.courseId !== id)
    data.marks = data.marks.filter(record => record.courseId !== id)
    save()
    return response({ success: true })
  },
  getFacultyCourses(facultyId) {
    return response(clone(data.courses.filter(course => course.facultyId === Number(facultyId))))
  },
  getStudentCourses(studentId) {
    const courseIds = data.enrollments.filter(item => item.studentId === Number(studentId)).map(item => item.courseId)
    return response(clone(data.courses.filter(course => courseIds.includes(course.id))))
  },
  getCourseStudents(courseId) {
    const studentIds = data.enrollments.filter(item => item.courseId === Number(courseId)).map(item => item.studentId)
    return response(clone(data.students.filter(student => studentIds.includes(student.id))))
  },
  markBulk(payload) {
    const course = data.courses.find(item => item.id === Number(payload.courseId))
    Object.entries(payload.attendance || {}).forEach(([studentId, status]) => {
      const student = data.students.find(item => item.id === Number(studentId))
      if (!student) return
      const existing = data.attendance.find(item =>
        item.courseId === Number(payload.courseId) &&
        item.studentId === Number(studentId) &&
        item.date === payload.date
      )
      if (existing) {
        existing.status = status
      } else {
        data.attendance.push({
          id: nextId(data.attendance),
          studentId: Number(studentId),
          studentName: student.name,
          courseId: Number(payload.courseId),
          courseName: course?.name || '',
          date: payload.date,
          status
        })
      }
    })
    save()
    return response({ success: true })
  },
  getAttendanceByStudent(studentId) {
    return response(clone(data.attendance.filter(record => record.studentId === Number(studentId))))
  },
  getAttendanceByCourse(courseId) {
    return response(clone(data.attendance.filter(record => record.courseId === Number(courseId))))
  },
  uploadMark(payload) {
    const student = data.students.find(item => item.id === Number(payload.studentId))
    const course = data.courses.find(item => item.id === Number(payload.courseId))
    const marksObtained = Number(payload.marksObtained)
    const totalMarks = Number(payload.totalMarks)
    const percentage = totalMarks ? Math.round(marksObtained / totalMarks * 100) : 0
    const existing = data.marks.find(item =>
      item.studentId === Number(payload.studentId) &&
      item.courseId === Number(payload.courseId) &&
      item.examType === payload.examType
    )
    const mark = {
      id: existing?.id || nextId(data.marks),
      studentId: Number(payload.studentId),
      studentName: student?.name || '',
      courseId: Number(payload.courseId),
      courseName: course?.name || '',
      examType: payload.examType,
      marksObtained,
      totalMarks,
      percentage,
      grade: gradeFor(percentage)
    }
    if (existing) Object.assign(existing, mark)
    else data.marks.push(mark)
    save()
    return response(mark)
  },
  getMarksByStudent(studentId) {
    return response(clone(data.marks.filter(record => record.studentId === Number(studentId))))
  },
  getMarksByCourse(courseId) {
    return response(clone(data.marks.filter(record => record.courseId === Number(courseId))))
  }
}
