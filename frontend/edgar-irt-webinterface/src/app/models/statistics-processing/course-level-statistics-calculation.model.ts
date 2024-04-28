export interface ICourseLevelStatisticsCalculation {
    id_question: number;

    score_perc_mean: number;
    score_perc_std_dev: number;
    score_perc_median: number;
    total_achieved: number;
    total_achievable: number;
    answers_count: number;
    correct_perc: number;
    incorrect_perc: number;
    unanswered_perc: number;
    partial_perc: number;
}
