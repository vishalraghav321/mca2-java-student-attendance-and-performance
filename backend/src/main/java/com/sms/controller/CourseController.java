package com.sms.controller;

import com.sms.dto.AppDTO;
import com.sms.entity.*;
import com.sms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CourseController {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final MarksRepository marksRepository;

    // ===================== COURSES =====================

    @GetMapping("/courses")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.CourseResponse>> getAllCourses(@AuthenticationPrincipal UserDetails principal) {
        User requester = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        if (requester.getRole() == User.Role.STUDENT) {
            return ResponseEntity.ok(requester.getCourses().stream()
                    .map(AppDTO.CourseResponse::from).collect(Collectors.toList()));
        }
        if (requester.getRole() == User.Role.FACULTY) {
            return ResponseEntity.ok(courseRepository.findByFacultyId(requester.getId()).stream()
                    .map(AppDTO.CourseResponse::from).collect(Collectors.toList()));
        }
        return ResponseEntity.ok(
                courseRepository.findAll().stream()
                        .map(AppDTO.CourseResponse::from)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/courses/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getCourse(@PathVariable Long id) {
        return courseRepository.findById(id)
                .map(c -> ResponseEntity.ok(AppDTO.CourseResponse.from(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/courses/{id}/students")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.UserResponse>> getCourseStudents(@PathVariable Long id) {
        Course course = courseRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Course not found"));
        courseRepository.findById(id).orElseThrow();
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (!auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))
                && (course.getFaculty() == null || !course.getFaculty().getEmail().equals(auth.getName()))) {
            return ResponseEntity.status(403).build();
        }
        List<AppDTO.UserResponse> students = course.getStudents().stream()
                .map(AppDTO.UserResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(students);
    }

    @PostMapping("/courses")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> createCourse(@RequestBody AppDTO.CourseRequest req) {
        if (courseRepository.findByCode(req.getCode()).isPresent()) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Course code already exists"));
        }
        User faculty = null;
        if (req.getFacultyId() != null) {
            faculty = userRepository.findById(req.getFacultyId())
                    .orElseThrow(() -> new IllegalArgumentException("Faculty not found"));
            if (faculty.getRole() != User.Role.FACULTY) {
                return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Assigned user must have FACULTY role"));
            }
        }

        Course course = Course.builder()
                .code(req.getCode())
                .name(req.getName())
                .description(req.getDescription())
                .credits(req.getCredits())
                .semester(req.getSemester())
                .faculty(faculty)
                .build();

        return ResponseEntity.ok(AppDTO.CourseResponse.from(courseRepository.save(course)));
    }

    @DeleteMapping("/courses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteCourse(@PathVariable Long id) {
        Course course = courseRepository.findById(id).orElse(null);
        if (course == null) {
            return ResponseEntity.notFound().build();
        }

        // Cleanly disassociate from all enrolled students
        for (User student : course.getStudents()) {
            student.getCourses().remove(course);
            userRepository.save(student);
        }

        attendanceRepository.deleteByCourseId(id);
        marksRepository.deleteByCourseId(id);
        courseRepository.deleteById(id);
        return ResponseEntity.ok(new AppDTO.MessageResponse("Course deleted"));
    }

    @GetMapping("/faculty/courses")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.CourseResponse>> getFacultyCourses(
            @RequestParam(required = false) Long facultyId,
            @AuthenticationPrincipal UserDetails principal) {
        User current = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        Long effectiveId = current.getRole() == User.Role.ADMIN
                ? (facultyId != null ? facultyId : current.getId())
                : current.getId();
        return ResponseEntity.ok(
                courseRepository.findByFacultyId(effectiveId).stream()
                        .map(AppDTO.CourseResponse::from)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/student/courses")
    @PreAuthorize("hasAnyRole('STUDENT','ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.CourseResponse>> getStudentCourses(
            @RequestParam(required = false) Long studentId,
            @AuthenticationPrincipal UserDetails principal) {
        User student = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        if (student.getRole() != User.Role.STUDENT) {
            if (studentId == null) return ResponseEntity.badRequest().build();
            student = userRepository.findById(studentId).orElseThrow();
        }
        return ResponseEntity.ok(
                student.getCourses().stream()
                        .map(AppDTO.CourseResponse::from)
                        .collect(Collectors.toList())
        );
    }

    // ===================== ATTENDANCE =====================

    @PostMapping("/attendance")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    @Transactional
    public ResponseEntity<?> markAttendance(@RequestBody AppDTO.AttendanceRequest req,
                                            @AuthenticationPrincipal UserDetails principal) {
        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        assertFacultyOwnsCourse(course, principal);
        User student = userRepository.findById(req.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        if (!course.getStudents().contains(student) || req.getDate() == null || req.getStatus() == null) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Invalid attendance data"));
        }
        if (req.getDate().isAfter(LocalDate.now())) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Attendance date cannot be in the future"));
        }
        Attendance attendance = attendanceRepository
                .findByStudentIdAndCourseIdAndDate(student.getId(), course.getId(), req.getDate())
                .orElse(Attendance.builder().student(student).course(course).date(req.getDate()).build());
        attendance.setStatus(req.getStatus());
        return ResponseEntity.ok(AppDTO.AttendanceResponse.from(attendanceRepository.save(attendance)));
    }

    @PostMapping("/attendance/bulk")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    @Transactional
    public ResponseEntity<?> markAttendanceBulk(@RequestBody AppDTO.AttendanceBulkRequest req,
                                                @AuthenticationPrincipal UserDetails principal) {
        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        assertFacultyOwnsCourse(course, principal);
        if (req.getDate() == null || req.getAttendance() == null || req.getAttendance().isEmpty()) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Invalid attendance data"));
        }
        if (req.getDate().isAfter(LocalDate.now())) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Attendance date cannot be in the future"));
        }
        for (Map.Entry<Long, Attendance.Status> entry : req.getAttendance().entrySet()) {
            if (entry.getValue() == null) throw new IllegalArgumentException("Invalid attendance status");
            User student = userRepository.findById(entry.getKey())
                    .orElseThrow(() -> new IllegalArgumentException("Student not found"));
            if (!course.getStudents().contains(student)) throw new IllegalArgumentException("Student is not enrolled");
            Attendance attendance = attendanceRepository
                    .findByStudentIdAndCourseIdAndDate(student.getId(), course.getId(), req.getDate())
                    .orElse(Attendance.builder().student(student).course(course).date(req.getDate()).build());
            attendance.setStatus(entry.getValue());
            attendanceRepository.save(attendance);
        }
        return ResponseEntity.ok(new AppDTO.MessageResponse("Attendance saved successfully"));
    }

    @GetMapping("/attendance/student/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT','ADMIN','FACULTY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.AttendanceResponse>> getStudentAttendance(
            @PathVariable Long studentId, @AuthenticationPrincipal UserDetails principal) {
        User requester = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        if (requester.getRole() == User.Role.STUDENT && !requester.getId().equals(studentId)) {
            return ResponseEntity.status(403).build();
        }
        if (requester.getRole() == User.Role.FACULTY) {
            User student = userRepository.findById(studentId).orElseThrow();
            boolean enrolledInAssignedCourse = requester.getId() != null && student.getCourses().stream()
                    .anyMatch(c -> c.getFaculty() != null && c.getFaculty().getId().equals(requester.getId()));
            if (!enrolledInAssignedCourse) return ResponseEntity.status(403).build();
        }
        List<AppDTO.AttendanceResponse> result = attendanceRepository.findByStudentId(studentId)
                .stream().map(a -> {
                    AppDTO.AttendanceResponse resp = AppDTO.AttendanceResponse.from(a);
                    long present = attendanceRepository.countByStudentIdAndCourseIdAndStatus(studentId, a.getCourse().getId(), Attendance.Status.PRESENT)
                            + attendanceRepository.countByStudentIdAndCourseIdAndStatus(studentId, a.getCourse().getId(), Attendance.Status.LATE);
                    Long total = attendanceRepository.countByStudentIdAndCourseId(studentId, a.getCourse().getId());
                    resp.setPercentage(total > 0 ? Math.round((present * 100.0 / total) * 10.0) / 10.0 : 0);
                    return resp;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/attendance/course/{courseId}")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.AttendanceResponse>> getCourseAttendance(
            @PathVariable Long courseId, @AuthenticationPrincipal UserDetails principal) {
        Course course = courseRepository.findById(courseId).orElseThrow(() -> new IllegalArgumentException("Course not found"));
        assertFacultyOwnsCourse(course, principal);
        return ResponseEntity.ok(
                attendanceRepository.findAll().stream()
                        .filter(a -> a.getCourse().getId().equals(courseId))
                        .map(AppDTO.AttendanceResponse::from)
                        .collect(Collectors.toList())
        );
    }

    // ===================== MARKS =====================

    @PostMapping("/marks")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    @Transactional
    public ResponseEntity<?> uploadMarks(@RequestBody AppDTO.MarksRequest req,
                                         @AuthenticationPrincipal UserDetails principal) {
        User student = userRepository.findById(req.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        assertFacultyOwnsCourse(course, principal);
        if (!course.getStudents().contains(student)) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Student is not enrolled in this course"));
        }
        if (req.getMarksObtained() == null || req.getTotalMarks() == null
                || req.getMarksObtained() < 0 || req.getTotalMarks() <= 0
                || req.getMarksObtained() > req.getTotalMarks()) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Invalid marks"));
        }
        Marks.ExamType examType;
        try {
            examType = Marks.ExamType.valueOf(req.getExamType());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Invalid assessment"));
        }

        Marks marks = marksRepository
                .findByStudentIdAndCourseIdAndExamType(student.getId(), course.getId(), examType)
                .orElse(Marks.builder().student(student).course(course).examType(examType).build());
        marks.setMarksObtained(req.getMarksObtained());
        marks.setTotalMarks(req.getTotalMarks());

        Marks saved = marksRepository.save(marks);
        return ResponseEntity.ok(AppDTO.MarksResponse.from(saved));
    }

    @GetMapping("/marks/student/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT','ADMIN','FACULTY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.MarksResponse>> getStudentMarks(
            @PathVariable Long studentId, @AuthenticationPrincipal UserDetails principal) {
        User requester = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        if (requester.getRole() == User.Role.STUDENT && !requester.getId().equals(studentId)) {
            return ResponseEntity.status(403).build();
        }
        if (requester.getRole() == User.Role.FACULTY) {
            User student = userRepository.findById(studentId).orElseThrow();
            boolean authorized = student.getCourses().stream().anyMatch(c ->
                    c.getFaculty() != null && c.getFaculty().getId().equals(requester.getId()));
            if (!authorized) return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(
                marksRepository.findByStudentId(studentId).stream()
                        .map(AppDTO.MarksResponse::from)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/marks/course/{courseId}")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.MarksResponse>> getCourseMarks(
            @PathVariable Long courseId, @AuthenticationPrincipal UserDetails principal) {
        Course course = courseRepository.findById(courseId).orElseThrow(() -> new IllegalArgumentException("Course not found"));
        assertFacultyOwnsCourse(course, principal);
        return ResponseEntity.ok(
                marksRepository.findByCourseId(courseId).stream()
                        .map(AppDTO.MarksResponse::from)
                        .collect(Collectors.toList())
        );
    }

    private void assertFacultyOwnsCourse(Course course, UserDetails principal) {
        User requester = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        if (requester.getRole() == User.Role.FACULTY
                        && (course.getFaculty() == null || !course.getFaculty().getId().equals(requester.getId()))) {
            throw new org.springframework.security.access.AccessDeniedException("Not authorized for this course");
        }
    }
}
