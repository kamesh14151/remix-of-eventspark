export interface FormFieldTemplate {
  label: string;
  field_type: "text" | "email" | "tel" | "url" | "select";
  required: boolean;
  position: number;
  placeholder?: string;
  options?: string[];
}

export const standardDefaultFields: FormFieldTemplate[] = [
  { label: "Full Name", field_type: "text", required: true, position: 0, placeholder: "e.g. Alex Johnson" },
  { label: "Email Address", field_type: "email", required: true, position: 1, placeholder: "alex@example.com" },
  { label: "Company", field_type: "text", required: false, position: 2, placeholder: "e.g. Acme Corp" },
  { label: "Job Title", field_type: "text", required: false, position: 3, placeholder: "e.g. Software Engineer" },
];

export const studentHackathonFields: FormFieldTemplate[] = [
  { label: "Full Name", field_type: "text", required: true, position: 0, placeholder: "e.g. Alex Rivera" },
  { label: "Email Address", field_type: "email", required: true, position: 1, placeholder: "student@college.edu" },
  { label: "Phone Number", field_type: "tel", required: true, position: 2, placeholder: "+91 98765 43210" },
  { label: "College / University", field_type: "text", required: true, position: 3, placeholder: "e.g. IIT Madras / Stanford / Anna University" },
  { label: "Department / Branch", field_type: "text", required: true, position: 4, placeholder: "e.g. Computer Science & Eng, AI & Data Science" },
  { label: "Year of Study", field_type: "text", required: true, position: 5, placeholder: "e.g. 1st Year, 2nd Year, 3rd Year, 4th Year, Post Graduate" },
  { label: "Degree / Program", field_type: "text", required: false, position: 6, placeholder: "e.g. B.Tech, B.E., B.Sc, BCA, MCA, M.Tech" },
  { label: "Roll Number / Student ID", field_type: "text", required: false, position: 7, placeholder: "e.g. CS2024-042" },
  { label: "GitHub / Portfolio", field_type: "url", required: false, position: 8, placeholder: "https://github.com/username" },
];

export const yearOfStudyOptions = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Post Graduate",
  "Other",
];

export const popularDepartments = [
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Data Science",
  "Electronics & Communication (ECE)",
  "Electrical & Electronics (EEE)",
  "Mechanical Engineering",
  "Civil Engineering",
  "BCA / MCA",
  "Cyber Security",
  "Software Engineering",
  "Data Science & Analytics",
  "Other",
];

export interface ExtractedStudentInfo {
  name: string;
  email: string;
  college?: string;
  department?: string;
  year?: string;
  degree?: string;
  rollNo?: string;
  github?: string;
  phone?: string;
  isStudent: boolean;
}

export function extractStudentInfo(data: Record<string, any> = {}): ExtractedStudentInfo {
  const normalize = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

  const findVal = (patterns: string[]): string => {
    for (const [k, v] of Object.entries(data)) {
      const normKey = normalize(k);
      for (const p of patterns) {
        if (normKey.includes(normalize(p))) {
          return String(v || "").trim();
        }
      }
    }
    return "";
  };

  const name = findVal(["fullname", "name", "attendee"]) || "Attendee";
  const email = findVal(["email", "mail"]) || "";
  const college = findVal(["college", "university", "clg", "institution", "campus", "school"]);
  const department = findVal(["department", "dept", "branch", "stream", "major", "fieldofstudy"]);
  const year = findVal(["yearofstudy", "year", "academic year", "batch", "gradyear"]);
  const degree = findVal(["degree", "program", "course", "qualification"]);
  const rollNo = findVal(["rollnumber", "rollno", "studentid", "regno", "registrationno", "idnumber"]);
  const github = findVal(["github", "portfolio", "git", "profilelink"]);
  const phone = findVal(["phone", "contact", "mobile", "whatsapp"]);

  const isStudent = !!(college || department || year || rollNo);

  return {
    name,
    email,
    college: college || undefined,
    department: department || undefined,
    year: year || undefined,
    degree: degree || undefined,
    rollNo: rollNo || undefined,
    github: github || undefined,
    phone: phone || undefined,
    isStudent,
  };
}
