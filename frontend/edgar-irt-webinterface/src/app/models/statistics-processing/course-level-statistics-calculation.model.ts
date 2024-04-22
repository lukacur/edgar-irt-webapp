export interface ICourseLevelStatisticsCalculation {
    id_question: number;

    score_mean: number;
    score_std_dev: number;
    score_median: number;
    total_achieved: number;
    total_achievable: number;
    answers_count: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    partial: number;
}
