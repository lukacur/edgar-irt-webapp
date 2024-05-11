export interface IEdgarStatProcessingCourseLevelCalc {
    id_question_param_calculation: number;

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

    // IRT related part of the calculation
    default_item_offset_parameter: number;
    level_of_item_knowledge: number;
    item_difficulty: number;
    item_guess_probability: number;
    item_mistake_probability: number;
    question_irt_classification: "easy" | "very_easy" | "normal" | "hard" | "very_hard";
}
