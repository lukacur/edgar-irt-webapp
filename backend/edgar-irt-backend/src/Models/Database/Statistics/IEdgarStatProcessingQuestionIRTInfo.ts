export interface IEdgarStatProcessingQuestionIRTInfo {
    id_course_based_info: number;

    /**
     * Not included when using default SELECT * query (have to do JOIN)
     */
    id_course: number;
    /**
     * Not included when using default SELECT * query (have to do JOIN)
     */
    calculation_group: string;
    /**
     * Not included when using default SELECT * query (have to do JOIN)
     */
    id_academic_years: number[];

    id_test_based_info: number[];
    id_question: number;

    default_item_offset_parameter: number;
    level_of_item_knowledge: number;
    item_difficulty: number;
    item_guess_probability: number;
    item_mistake_probability: number;
}
