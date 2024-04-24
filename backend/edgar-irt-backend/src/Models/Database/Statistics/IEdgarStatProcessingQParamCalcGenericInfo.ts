export interface IEdgarStatProcessingQParamCalcGenericInfo {
    id: number;
    calculation_group: string;

    id_based_on_course: number;
    id_based_on_test: number | null;
    id_question: number;
    created_on: string;
}
