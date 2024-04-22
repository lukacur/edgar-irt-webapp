export interface ITestLevelStatisticsCalculation {
    id_question: number;
    id_based_on_test: number;

    mean: number;
    std_dev: number;
    count: number;
    median: number;
    sum: number;
    part_of_total_sum: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    partial: number;
}
