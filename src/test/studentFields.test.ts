import { describe, it, expect } from "vitest";
import { extractStudentInfo, studentHackathonFields } from "@/lib/studentFields";

describe("studentFields", () => {
  it("should have student specific fields for hackathons", () => {
    const labels = studentHackathonFields.map(f => f.label);
    expect(labels).toContain("Full Name");
    expect(labels).toContain("Email Address");
    expect(labels).toContain("College / University");
    expect(labels).toContain("Department / Branch");
    expect(labels).toContain("Year of Study");
    expect(labels).toContain("Roll Number / Student ID");
    expect(labels).toContain("GitHub / Portfolio");
  });

  it("should extract student details from registration data with standard keys", () => {
    const data = {
      "Full Name": "Rahul Sharma",
      "Email Address": "rahul@iitm.ac.in",
      "College / University": "IIT Madras",
      "Department / Branch": "Computer Science & Engineering",
      "Year of Study": "3rd Year",
      "Roll Number / Student ID": "CS21B045",
      "GitHub / Portfolio": "https://github.com/rahulsharma",
    };

    const info = extractStudentInfo(data);
    expect(info.isStudent).toBe(true);
    expect(info.name).toBe("Rahul Sharma");
    expect(info.email).toBe("rahul@iitm.ac.in");
    expect(info.college).toBe("IIT Madras");
    expect(info.department).toBe("Computer Science & Engineering");
    expect(info.year).toBe("3rd Year");
    expect(info.rollNo).toBe("CS21B045");
    expect(info.github).toBe("https://github.com/rahulsharma");
  });

  it("should extract student details with variations of keys like clg, dept, etc.", () => {
    const data = {
      name: "Sneha Patel",
      email: "sneha@stanford.edu",
      clg: "Stanford University",
      dept: "Artificial Intelligence",
      gradYear: "2026",
      studentid: "STU-994",
    };

    const info = extractStudentInfo(data);
    expect(info.isStudent).toBe(true);
    expect(info.college).toBe("Stanford University");
    expect(info.department).toBe("Artificial Intelligence");
    expect(info.rollNo).toBe("STU-994");
  });

  it("should identify non-student attendee data", () => {
    const data = {
      "Full Name": "Mark Zuckerberg",
      "Email Address": "mark@meta.com",
      "Company": "Meta",
      "Job Title": "CEO",
    };

    const info = extractStudentInfo(data);
    expect(info.isStudent).toBe(false);
    expect(info.college).toBeUndefined();
  });
});
