package com.sms.controller;

import com.sms.dto.AppDTO;
import com.sms.dto.AuthDTO;
import com.sms.entity.User;
import com.sms.repository.UserRepository;
import com.sms.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDTO.LoginRequest request) {
        try {
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(new AppDTO.MessageResponse("Invalid credentials"));
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();

        String token = jwtUtil.generateToken(userDetails, user.getRole().name());

        return ResponseEntity.ok(AuthDTO.LoginResponse.builder()
                .token(token)
                .role(user.getRole().name())
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .mustChangePassword(user.isMustChangePassword())
                .build());
    }

    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> register(@Valid @RequestBody AuthDTO.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Email already registered"));
        }
        User.Role requestedRole = request.getRole() != null ? request.getRole() : User.Role.STUDENT;
        if (requestedRole == User.Role.ADMIN) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Admin accounts cannot be created through this endpoint"));
        }
        if (requestedRole == User.Role.STUDENT && request.getRollNumber() != null
                && userRepository.existsByRollNumber(request.getRollNumber())) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Roll number already registered"));
        }
        String temporaryPassword = generateTemporaryPassword();

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(temporaryPassword))
                .role(requestedRole)
                .mustChangePassword(true)
                .rollNumber(request.getRollNumber())
                .branch(request.getBranch())
                .semester(request.getSemester())
                .department(request.getDepartment())
                .designation(request.getDesignation())
                .build();

        userRepository.save(user);
        return ResponseEntity.ok(AuthDTO.AccountCreatedResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .temporaryPassword(temporaryPassword)
                .build());
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal UserDetails userDetails,
                                            @Valid @RequestBody AuthDTO.ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("New password and confirmation do not match"));
        }
        if (!isStrongPassword(request.getNewPassword())) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse(
                    "Password must be at least 8 characters and include uppercase, lowercase, digit and special character"));
        }

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("Current password is incorrect"));
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body(new AppDTO.MessageResponse("New password must not reuse the current password"));
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
        return ResponseEntity.ok(new AppDTO.MessageResponse("Password changed successfully. Please log in again."));
    }

    private boolean isStrongPassword(String password) {
        return password != null && password.length() >= 8
                && password.matches(".*[A-Z].*")
                && password.matches(".*[a-z].*")
                && password.matches(".*\\d.*")
                && password.matches(".*[^A-Za-z0-9].*");
    }

    private String generateTemporaryPassword() {
        SecureRandom random = new SecureRandom();
        String upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lower = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String special = "!@#$%^&*";
        String all = upper + lower + digits + special;
        StringBuilder password = new StringBuilder();
        password.append(upper.charAt(random.nextInt(upper.length())));
        password.append(lower.charAt(random.nextInt(lower.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(special.charAt(random.nextInt(special.length())));
        for (int i = 4; i < 16; i++) {
            password.append(all.charAt(random.nextInt(all.length())));
        }
        char[] chars = password.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }
        return new String(chars);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@org.springframework.security.core.annotation.AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(AppDTO.UserResponse.from(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(new AppDTO.MessageResponse("Logged out"));
    }
}
