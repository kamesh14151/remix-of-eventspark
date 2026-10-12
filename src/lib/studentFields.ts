
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
  { label: "Phone Number", field_type: "tel", required: false, position: 2, placeholder: "+91 98765 43210" },
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

export const salemColleges = [
  "Sona College of Technology, Salem",
  "KSR College of Technology, Tiruchengode",
  "KSR Institute for Engineering and Technology, Tiruchengode",
  "Government College of Engineering (GCE), Salem",
  "Knowledge Institute of Technology (KIOT), Salem",
  "Sona College of Arts and Science, Salem",
  "Mahendra Engineering College, Mallasamudram",
  "Mahendra Institute of Technology, Mallasamudram",
  "Muthayammal Engineering College, Rasipuram",
  "Muthayammal College of Arts and Science, Rasipuram",
  "Vinayaka Mission's Kirupananda Variyar Engineering College, Salem",
  "AVS Engineering College, Salem",
  "AVS College of Arts & Science, Salem",
  "Dhirajlal Gandhi College of Technology (DGCT), Salem",
  "Narasu's Sarathy Institute of Technology, Salem",
  "Annapoorana Engineering College, Salem",
  "Periyar University, Salem",
  "Government Arts College (Autonomous), Salem",
  "Sri Ganesh College of Arts and Science, Salem",
  "Salem Sowdeswari College, Salem",
  "Vivekanandha College of Engineering for Women, Tiruchengode",
  "Excel Engineering College, Komarapalayam",
  "Sengunthar Engineering College, Tiruchengode",
];

export const otherTopColleges = [
  "Kongu Engineering College, Perundurai",
  "Bannari Amman Institute of Technology (BIT), Sathyamangalam",
  "PSG College of Technology, Coimbatore",
  "Kumaraguru College of Technology (KCT), Coimbatore",
  "Sri Krishna College of Engineering and Technology (SKCET), Coimbatore",
  "Coimbatore Institute of Technology (CIT), Coimbatore",
  "Government College of Technology (GCT), Coimbatore",
  "Anna University (CEG / MIT), Chennai",
  "National Institute of Technology (NIT), Trichy",
  "IIT Madras, Chennai",
  "SASTRA Deemed University, Thanjavur",
  "Vellore Institute of Technology (VIT), Vellore",
];

export const popularColleges = [
  ...salemColleges,
  ...otherTopColleges,
  "Other",
];

export const popularDepartments = [
  "Computer Science & Engineering (CSE)",
  "Artificial Intelligence & Data Science (AI & DS)",
  "Information Technology (IT)",
  "Computer Science & Business Systems (CSBS)",
  "Artificial Intelligence & Machine Learning (AIML)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (MECH)",
  "Civil Engineering",
  "Cyber Security",
  "BCA (Bachelor of Computer Applications)",
  "MCA (Master of Computer Applications)",
  "B.Sc Computer Science / IT",
  "Data Science & Analytics",
  "Robotics & Automation",
  "Biomedical Engineering",
  "Mechatronics Engineering",
  "Biotechnology",
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
