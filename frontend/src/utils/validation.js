export function required(value, label = 'This field') {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${label} is required`
  }
  return ''
}

export function validateFullName(value) {
  const missing = required(value, 'Name')
  if (missing) return missing
  if (value.trim().length < 3 || value.trim().length > 50) {
    return 'Name must be between 3 and 50 characters'
  }
  return ''
}

export function validateEmail(value) {
  const missing = required(value, 'Email')
  if (missing) return missing
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) {
    return 'Enter a valid email address'
  }
  return ''
}

export function validatePassword(value) {
  const missing = required(value, 'Password')
  if (missing) return missing
  if (value.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must contain at least one letter and one number'
  }
  return ''
}

export function validateInteger(value, label = 'Value', min, max) {
  const missing = required(value, label)
  if (missing) return missing
  if (!/^[-+]?\d+$/.test(String(value).trim()) || !Number.isInteger(Number(value))) {
    return `${label} must be a whole number`
  }
  const number = Number(value)
  if (min !== undefined && number < min) return `${label} must be at least ${min}`
  if (max !== undefined && number > max) return `${label} must be at most ${max}`
  return ''
}

export function validateSemester(value) {
  return validateInteger(value, 'Semester', 1, 8)
}

export function validateRollNumber(value) {
  const missing = required(value, 'Roll number')
  if (missing) return missing
  if (value.trim().length > 30) return 'Roll number must be 30 characters or fewer'
  if (!/^[A-Za-z0-9-]+$/.test(value.trim())) {
    return 'Roll number may contain only letters, numbers, and hyphens'
  }
  return ''
}

export function validateCourseCode(value) {
  const missing = required(value, 'Course code')
  if (missing) return missing
  if (value.trim().length > 20) return 'Course code must be 20 characters or fewer'
  if (!/^[A-Za-z0-9-]+$/.test(value.trim())) {
    return 'Course code may contain only letters, numbers, and hyphens'
  }
  return ''
}

export function validateDate(value, { allowFuture = true } = {}) {
  const missing = required(value, 'Date')
  if (missing) return missing
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a valid date'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return 'Enter a valid date'
  }
  if (!allowFuture) {
    const today = new Date()
    const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (value > todayValue) return 'Date cannot be in the future'
  }
  return ''
}

export function validateMarks(obtained, total) {
  const obtainedMissing = required(obtained, 'Obtained marks')
  if (obtainedMissing) return obtainedMissing
  const totalMissing = required(total, 'Total marks')
  if (totalMissing) return totalMissing
  if (!/^[-+]?(?:\d+|\d*\.\d+)$/.test(String(obtained).trim())) {
    return 'Obtained marks must be a valid number'
  }
  if (!/^[-+]?(?:\d+|\d*\.\d+)$/.test(String(total).trim())) {
    return 'Total marks must be a valid number'
  }
  const obtainedNumber = Number(obtained)
  const totalNumber = Number(total)
  if (totalNumber <= 0) return 'Total marks must be greater than zero'
  if (obtainedNumber < 0) return 'Obtained marks cannot be negative'
  if (obtainedNumber > totalNumber) return 'Obtained marks cannot exceed total marks'
  return ''
}

export function validateDuplicate(value, records, getter, label = 'Record') {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return ''
  const duplicate = records.some(record => String(getter(record) ?? '').trim().toLowerCase() === normalized)
  return duplicate ? `${label} already exists` : ''
}
