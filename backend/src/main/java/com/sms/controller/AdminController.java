package com.sms.controller;

import com.sms.dto.AppDTO;
import com.sms.entity.Course;
import com.sms.entity.User;
import com.sms.repository.AttendanceRepository;
import com.sms.repository.CourseRepository;
import com.sms.repository.MarksRepository;
import com.sms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final AttendanceRepository attendanceRepository;
    private final MarksRepository marksRepository;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getDashboard() {
        long students = userRepository.findByRole(User.Role.STUDENT).size();
        long faculty = userRepository.findByRole(User.Role.FACULTY).size();
        long courses = courseRepository.count();

        return ResponseEntity.ok(Map.of(
                "totalStudents", students,
                "totalFaculty", faculty,
                "totalCourses", courses
        ));
    }

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.UserResponse>> getAllStudents() {
        return ResponseEntity.ok(
                userRepository.findByRole(User.Role.STUDENT)
                        .stream().map(AppDTO.UserResponse::from)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AppDTO.UserResponse>> getAllFaculty() {
        return ResponseEntity.ok(
                userRepository.findByRole(User.Role.FACULTY)
                        .stream().map(AppDTO.UserResponse::from)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/students/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getStudent(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(AppDTO.UserResponse.from(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> updateStudent(@PathVariable Long id, @RequestBody AppDTO.UserResponse req) {
        return userRepository.findById(id).map(user -> {
            if (req.getName() != null) user.setName(req.getName());
            if (req.getBranch() != null) user.setBranch(req.getBranch());
            if (req.getSemester() != null) user.setSemester(req.getSemester());
            userRepository.save(user);
            return ResponseEntity.ok(AppDTO.UserResponse.from(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/students/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteStudent(@PathVariable Long id) {
        User student = userRepository.findById(id).orElse(null);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        student.getCourses().clear();
        userRepository.save(student);
        attendanceRepository.deleteByStudentId(id);
        marksRepository.deleteByStudentId(id);
        userRepository.deleteById(id);
        return ResponseEntity.ok(new AppDTO.MessageResponse("Student deleted"));
    }

    @PostMapping("/enroll")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> enrollStudent(@RequestBody AppDTO.EnrollRequest req) {
        User student = userRepository.findById(req.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found with ID: " + req.getStudentId()));
        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + req.getCourseId()));
        if (student.getRole() != User.Role.STUDENT) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("User is not a student"));
        }
        if (student.getCourses().contains(course)) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Student is already enrolled"));
        }
        student.getCourses().add(course);
        userRepository.save(student);
        return ResponseEntity.ok(new AppDTO.MessageResponse("Enrolled successfully"));
    }
}
