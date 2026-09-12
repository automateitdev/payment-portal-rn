type Option = {
  label: string;
  value: string;
  [key: string]: unknown;
};

export const genders: Option[] = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Other", value: "Other" },
];

export const religions: Option[] = [
  { label: "Islam", value: "Islam" },
  { label: "Hinduism", value: "Hinduism" },
  { label: "Buddhism", value: "Buddhism" },
  { label: "Christianity", value: "Christianity" },
  { label: "Other", value: "Other" },
];
