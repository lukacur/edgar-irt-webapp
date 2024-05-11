export interface IBaseIrtParameters {
    default_item_offset_parameter: number;
    level_of_item_knowledge: number;
    item_difficulty: number;
    item_guess_probability: number;
    item_mistake_probability: number;
}

export interface IQuestionIrtParameters extends IBaseIrtParameters {
    id_course_based_info: number;
    id_course: number;
    calculation_group: string;
    id_academic_years: number[];

    testBasedInfo: { id_test_based_info: number, id_based_on_test: number }[];
    id_question: number;
}
