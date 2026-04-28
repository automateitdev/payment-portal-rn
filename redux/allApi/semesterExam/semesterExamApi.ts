// import { baseApi } from "@/redux/baseApi/baseApi";

// type Primitive = string | number | null | undefined;

// type JsonObject = Record<string, unknown>;
// type RawExamItem = JsonObject;

// export type StudentExamOption = {
//   examId: number;
//   examName: string;
//   academicYearId: number | null;
//   academicYearName: string;
//   combinationsPivotId?: number | null;
// };

// export type StudentSpecificResultPayload = {
//   academic_year_id: number;
//   exam_id: number;
// };

// const toArray = (value: unknown): RawExamItem[] => {
//   const response = value as {
//     payload?: {
//       data?: {
//         data?: unknown[];
//         student_exam_list?: unknown[];
//         exam_list?: unknown[];
//       } | unknown[];
//     };
//     data?: unknown[];
//     student_exam_list?: unknown[];
//   };

//   if (Array.isArray(value)) {
//     return value;
//   }

//   if (Array.isArray(response?.payload?.data)) {
//     return response.payload.data as RawExamItem[];
//   }

//   if (Array.isArray(response?.payload?.data?.data)) {
//     return response.payload.data.data as RawExamItem[];
//   }

//   if (Array.isArray(response?.payload?.data?.student_exam_list)) {
//     return response.payload.data.student_exam_list as RawExamItem[];
//   }

//   if (Array.isArray(response?.payload?.data?.exam_list)) {
//     return response.payload.data.exam_list as RawExamItem[];
//   }

//   if (Array.isArray(response?.data)) {
//     return response.data as RawExamItem[];
//   }

//   if (Array.isArray(response?.student_exam_list)) {
//     return response.student_exam_list as RawExamItem[];
//   }

//   return [];
// };

// const pickString = (...values: Primitive[]) =>
//   values.find((value) => value !== null && value !== undefined && `${value}`.trim() !== "")
//     ? String(
//         values.find(
//           (value) =>
//             value !== null && value !== undefined && `${value}`.trim() !== "",
//         ),
//       )
//     : "";

// const pickNumber = (...values: Primitive[]) => {
//   const rawValue = values.find(
//     (value) => value !== null && value !== undefined && `${value}`.trim() !== "",
//   );
//   const numericValue = Number(rawValue);
//   return Number.isFinite(numericValue) ? numericValue : null;
// };

// export const semesterExamApi = baseApi.injectEndpoints({
//   endpoints: (builder) => ({
//     getStudentExamList: builder.query<StudentExamOption[], void>({
//       query: () => ({
//         url: "/payment-portal/student-exam-list",
//         method: "GET",
//       }),
//       keepUnusedDataFor: 0,
//       transformResponse: (response: unknown) =>
//         toArray(response)
//           .flatMap((item) => {
//             const academicYearId = pickNumber(
//               item.academic_year_id as Primitive,
//               item.year_id as Primitive,
//               item.academicYearId as Primitive,
//               (item.academic_year as JsonObject | undefined)?.id as Primitive,
//             );

//             const academicYearName =
//               pickString(
//                 item.academic_year as Primitive,
//                 item.academic_year_name as Primitive,
//                 item.year_name as Primitive,
//                 item.year as Primitive,
//                 (item.academic_year as JsonObject | undefined)?.name as Primitive,
//               ) || "Academic Year";

//             const nestedExams = Array.isArray(item.exams)
//               ? item.exams
//               : Array.isArray(item.exam_list)
//                 ? item.exam_list
//                 : [];

//             if (nestedExams.length) {
//               return nestedExams.map((exam) => {
//                 const examItem = exam as JsonObject;

//                 return {
//                   examId: pickNumber(
//                     examItem.exam_id as Primitive,
//                     examItem.id as Primitive,
//                     examItem.student_exam_id as Primitive,
//                     (examItem.exam as JsonObject | undefined)?.id as Primitive,
//                   ),
//                   examName: pickString(
//                     examItem.exam_name as Primitive,
//                     examItem.name as Primitive,
//                     examItem.title as Primitive,
//                     (examItem.exam as JsonObject | undefined)?.name as Primitive,
//                   ),
//                   academicYearId,
//                   academicYearName,
//                   combinationsPivotId: pickNumber(
//                     examItem.combinations_pivot_id as Primitive,
//                   ),
//                 };
//               });
//             }

//             return [
//               {
//                 examId: pickNumber(
//                   item.exam_id as Primitive,
//                   item.id as Primitive,
//                   item.student_exam_id as Primitive,
//                   (item.exam as JsonObject | undefined)?.id as Primitive,
//                 ),
//                 examName: pickString(
//                   item.exam_name as Primitive,
//                   item.name as Primitive,
//                   item.title as Primitive,
//                   (item.exam as JsonObject | undefined)?.name as Primitive,
//                 ),
//                 academicYearId,
//                 academicYearName,
//                 combinationsPivotId: pickNumber(
//                   item.combinations_pivot_id as Primitive,
//                 ),
//               },
//             ];
//           })
//           .filter((item) => item.examId && item.examName) as StudentExamOption[],
//     }),

//     getStudentSpecificResult: builder.mutation<
//       unknown,
//       StudentSpecificResultPayload
//     >(
//       {
//         query: (body) => ({
//           url: "/payment-portal/student-specific-result",
//           method: "POST",
//           body,
//         }),
//       },
//     ),
//   }),
// });

// export const {
//   useGetStudentExamListQuery,
//   useGetStudentSpecificResultMutation,
// } = semesterExamApi;
import { baseApi } from "@/redux/baseApi/baseApi";

type Primitive = string | number | null | undefined;

type JsonObject = Record<string, unknown>;
type RawExamItem = JsonObject;

export type StudentExamOption = {
  examId: number;
  examName: string;
  academicYearId: number | null;
  academicYearName: string;
  combinationsPivotId?: number | null;
  class?: string;
  shift?: string;
  section?: string;
  group?: string;
};

export type StudentSpecificResultPayload = {
  academic_year_id: number;
  exam_id: number;
};

const toArray = (value: unknown): RawExamItem[] => {
  const response = value as {
    payload?: {
      data?:
        | {
            data?: unknown[];
            student_exam_list?: unknown[];
            exam_list?: unknown[];
          }
        | unknown[];
    };
    data?: unknown[];
    student_exam_list?: unknown[];
  };

  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(response?.payload?.data)) {
    return response.payload.data as RawExamItem[];
  }

  if (Array.isArray(response?.payload?.data?.data)) {
    return response.payload.data.data as RawExamItem[];
  }

  if (Array.isArray(response?.payload?.data?.student_exam_list)) {
    return response.payload.data.student_exam_list as RawExamItem[];
  }

  if (Array.isArray(response?.payload?.data?.exam_list)) {
    return response.payload.data.exam_list as RawExamItem[];
  }

  if (Array.isArray(response?.data)) {
    return response.data as RawExamItem[];
  }

  if (Array.isArray(response?.student_exam_list)) {
    return response.student_exam_list as RawExamItem[];
  }

  return [];
};

const pickString = (...values: Primitive[]) =>
  values.find(
    (value) =>
      value !== null && value !== undefined && `${value}`.trim() !== "",
  )
    ? String(
        values.find(
          (value) =>
            value !== null && value !== undefined && `${value}`.trim() !== "",
        ),
      )
    : "";

const pickNumber = (...values: Primitive[]) => {
  const rawValue = values.find(
    (value) =>
      value !== null && value !== undefined && `${value}`.trim() !== "",
  );
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const semesterExamApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudentExamList: builder.query<StudentExamOption[], void>({
      query: () => ({
        url: "/payment-portal/student-exam-list",
        method: "GET",
      }),
      keepUnusedDataFor: 0,
      transformResponse: (response: unknown) =>
        toArray(response)
          .flatMap((item) => {
            const academicYearId = pickNumber(
              item.academic_year_id as Primitive,
              item.year_id as Primitive,
              item.academicYearId as Primitive,
              (item.academic_year as JsonObject | undefined)?.id as Primitive,
            );

            const academicYearName =
              pickString(
                item.academic_year as Primitive,
                item.academic_year_name as Primitive,
                item.year_name as Primitive,
                item.year as Primitive,
                (item.academic_year as JsonObject | undefined)
                  ?.name as Primitive,
              ) || "Academic Year";

            const itemClass = pickString(item.class as Primitive);
            const itemShift = pickString(item.shift as Primitive);
            const itemSection = pickString(item.section as Primitive);
            const itemGroup = pickString(item.group as Primitive);

            const nestedExams = Array.isArray(item.exams)
              ? item.exams
              : Array.isArray(item.exam_list)
                ? item.exam_list
                : [];

            if (nestedExams.length) {
              return nestedExams.map((exam) => {
                const examItem = exam as JsonObject;

                return {
                  examId: pickNumber(
                    examItem.exam_id as Primitive,
                    examItem.id as Primitive,
                    examItem.student_exam_id as Primitive,
                    (examItem.exam as JsonObject | undefined)?.id as Primitive,
                  ),
                  examName: pickString(
                    examItem.exam_name as Primitive,
                    examItem.name as Primitive,
                    examItem.title as Primitive,
                    (examItem.exam as JsonObject | undefined)
                      ?.name as Primitive,
                  ),
                  academicYearId,
                  academicYearName,
                  combinationsPivotId: pickNumber(
                    examItem.combinations_pivot_id as Primitive,
                  ),
                  class: itemClass,
                  shift: itemShift,
                  section: itemSection,
                  group: itemGroup,
                };
              });
            }

            return [
              {
                examId: pickNumber(
                  item.exam_id as Primitive,
                  item.id as Primitive,
                  item.student_exam_id as Primitive,
                  (item.exam as JsonObject | undefined)?.id as Primitive,
                ),
                examName: pickString(
                  item.exam_name as Primitive,
                  item.name as Primitive,
                  item.title as Primitive,
                  (item.exam as JsonObject | undefined)?.name as Primitive,
                ),
                academicYearId,
                academicYearName,
                combinationsPivotId: pickNumber(
                  item.combinations_pivot_id as Primitive,
                ),
                class: itemClass,
                shift: itemShift,
                section: itemSection,
                group: itemGroup,
              },
            ];
          })
          .filter(
            (item) => item.examId && item.examName,
          ) as StudentExamOption[],
    }),

    getStudentSpecificResult: builder.mutation<
      unknown,
      StudentSpecificResultPayload
    >({
      query: (body) => ({
        url: "/payment-portal/student-specific-result",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetStudentExamListQuery,
  useGetStudentSpecificResultMutation,
} = semesterExamApi;
