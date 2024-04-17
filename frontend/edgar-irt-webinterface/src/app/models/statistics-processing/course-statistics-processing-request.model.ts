export interface ICourseStatisticsProcessingRequest {
    idCourse: number;
    idStartAcademicYear: number;
    numberOfIncludedPreviousYears: number;

    userRequested: number | null;

    forceCalculation: boolean;
    periodical: boolean;
};
