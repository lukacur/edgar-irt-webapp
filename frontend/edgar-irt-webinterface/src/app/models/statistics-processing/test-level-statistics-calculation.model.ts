export interface ITestLevelStatisticsCalculation {
    id_question: number;
    id_based_on_test: number;

    score_perc_mean: number;
    score_perc_std_dev: number;
    count: number;
    score_perc_median: number;
    score_sum: number;
    part_of_total_sum: number;
    correct_perc: number;
    incorrect_perc: number;
    unanswered_perc: number;
    partial_perc: number;
}
