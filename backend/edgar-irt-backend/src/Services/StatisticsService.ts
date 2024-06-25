import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { IEdgarCourse } from "../Models/Database/Edgar/IEdgarCourse.js";
import { IEdgarStatProcessingCalculation } from "../Models/Database/Statistics/IEdgarStatProcessingCalculation.js";
import { IEdgarStatProcessingCourseLevelCalc } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { IEdgarStatProcessingQParamCalcGenericInfo } from "../Models/Database/Statistics/IEdgarStatProcessingQParamCalcGenericInfo.js";
import { IEdgarStatProcessingQuestionIRTInfo } from "../Models/Database/Statistics/IEdgarStatProcessingQuestionIRTInfo.js";
import { IEdgarStatProcessingTestLevelCalc } from "../Models/Database/Statistics/IEdgarStatProcessingTestLevelCalc.js";

export class StatisticsService {
    constructor(
        private readonly dbConn: DatabaseConnection,
    ) {}

    public async getAllCalculations(): Promise<IEdgarStatProcessingQParamCalcGenericInfo[]> {
        return (await this.dbConn.doQuery<IEdgarStatProcessingQParamCalcGenericInfo>(
            `SELECT *
            FROM statistics_schema.question_param_calculation`,
        ))?.rows ?? [];
    }

    public async getCourseLevelCalculationsOfCalculationGroup(
        calculationGroup: string
    ): Promise<IEdgarStatProcessingCourseLevelCalc[]> {
        return (await this.dbConn.doQuery<IEdgarStatProcessingCourseLevelCalc>(
            `SELECT question_param_calculation.id_question,
                    question_param_course_level_calculation.*
            FROM statistics_schema.question_param_course_level_calculation
                JOIN statistics_schema.question_param_calculation
                    ON question_param_course_level_calculation.id_question_param_calculation =
                        question_param_calculation.id
                JOIN public.question
                    ON question_param_calculation.id_question = question.id
            WHERE question_param_calculation.calculation_group = $1 AND
                question.is_active`,
            [calculationGroup],
        ))?.rows ?? [];
    }

    public async getTestLevelCalculationsOfCalculationGroup(
        calculationGroup: string
    ): Promise<IEdgarStatProcessingTestLevelCalc[]> {
        return (await this.dbConn.doQuery<IEdgarStatProcessingTestLevelCalc>(
            `SELECT question_param_calculation.id_question,
                    question_param_calculation.id_based_on_test,
                    question_param_test_level_calculation.*
            FROM statistics_schema.question_param_test_level_calculation
                JOIN statistics_schema.question_param_calculation
                    ON question_param_test_level_calculation.id_question_param_calculation =
                        question_param_calculation.id
                JOIN public.question
                    ON question_param_calculation.id_question = question.id
            WHERE question_param_calculation.calculation_group = $1 AND
                question.is_active`,
            [calculationGroup],
        ))?.rows ?? [];
    }

    public async getAcademicYearsForCalculation(idCalculation: number): Promise<{ id_academic_year: number }[]> {
        return (await this.dbConn.doQuery<{ id_academic_year: number }>(
            `SELECT *
            FROM statistics_schema.question_param_calculation_academic_year
            WHERE id_question_param_calculation = $1`,
            [idCalculation],
        ))?.rows ?? [];
    }

    public async getCoursesWithStatistics(): Promise<IEdgarCourse[]> {
        return (await this.dbConn.doQuery<IEdgarCourse>(
            `SELECT DISTINCT course.*
            FROM public.course
                JOIN statistics_schema.question_param_calculation
                    ON course.id = question_param_calculation.id_based_on_course`,
        ))?.rows ?? [];
    }

    public async getCourseCalculations(idCourse: number): Promise<IEdgarStatProcessingCalculation[]> {
        return (await this.dbConn.doQuery<IEdgarStatProcessingCalculation>(
            `SELECT DISTINCT
                question_param_calculation.id_based_on_course,
                created_on,
                calculation_group,
                id_academic_year
            FROM statistics_schema.question_param_calculation
                JOIN statistics_schema.question_param_calculation_academic_year
                    ON question_param_calculation.id =
                        question_param_calculation_academic_year.id_question_param_calculation
            WHERE question_param_calculation.id_based_on_course = $1`,
            [idCourse],
        ))?.rows ?? [];
    }

    public async getQuestionIrtParameters(idQuestion: number): Promise<IEdgarStatProcessingQuestionIRTInfo[]> {
        const questionIRTParameters: IEdgarStatProcessingQuestionIRTInfo[] = (
            await this.dbConn.doQuery<IEdgarStatProcessingQuestionIRTInfo>(
                `SELECT id_question_param_calculation AS id_course_based_info,
                        default_item_offset_parameter,
                        level_of_item_knowledge,
                        item_difficulty,
                        item_guess_probability,
                        item_mistake_probability,
                        question_irt_classification,
                        id_based_on_course AS id_course,
                        calculation_group,
                        id_question
                FROM statistics_schema.question_param_course_level_calculation
                    JOIN statistics_schema.question_param_calculation
                        ON question_param_course_level_calculation.id_question_param_calculation =
                            question_param_calculation.id
                WHERE question_param_calculation.id_question = $1`,
                [ idQuestion ]
            )
        )?.rows ?? [];

        for (const info of questionIRTParameters) {
            const acYearIds: number[] = (
                await this.dbConn.doQuery<{ id_academic_year: number }>(
                    `SELECT DISTINCT id_academic_year
                    FROM statistics_schema.question_param_calculation
                        JOIN statistics_schema.question_param_calculation_academic_year
                            ON question_param_calculation.id =
                                question_param_calculation_academic_year.id_question_param_calculation
                    WHERE calculation_group = $1`,
                    [ info.calculation_group ]
                )
            )?.rows.map(r => r.id_academic_year) ?? [];

            const tbInfoIds: { id_test_based_info: number, id_based_on_test: number }[] = (
                await this.dbConn.doQuery<{ id_test_based_info: number, id_based_on_test: number }>(
                    `SELECT DISTINCT id AS id_test_based_info,
                            id_based_on_test
                    FROM statistics_schema.question_param_calculation
                    WHERE id_based_on_test IS NOT NULL AND
                            calculation_group = $1 AND
                            id_question = $2`,
                    [ info.calculation_group, idQuestion ]
                )
            )?.rows ?? [];

            info.id_academic_years = acYearIds;
            info.testBasedInfo = tbInfoIds;
        }

        return questionIRTParameters;
    }
}
