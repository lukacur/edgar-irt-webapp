import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { TransactionContext } from "../Database/TransactionContext.js";
import { IExerciseDefinition } from "../Models/Database/AdaptiveExercise/IExerciseDefinition.js";
import { IExerciseQuestionDifficultyOverride } from "../Models/Database/AdaptiveExercise/IExerciseQuestionDifficultyOverride.js";
import { IQuestionDifficultyInfo } from "../Models/Database/AdaptiveExercise/IQuestionDifficultyInfo.js";
import { IQuestionNodeWhitelistEntry } from "../Models/Database/AdaptiveExercise/IQuestionNodeWhitelistEntry.js";
import { IEdgarNode } from "../Models/Database/Edgar/IEdgarNode.js";
import { QuestionIrtClassification } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { QuestionClassificationUtil } from "../Util/QuestionClassificationUtil.js";
import { CourseService } from "./CourseService.js";

export type ExerciseDefinitionProgressionDescriptor = {
    correctAnswersToUpgrade: number;
    incorrectAnswersToDowngrade: number;
    skippedQuestionsToDowngrade: number;
};

type QuestionDifficulty = {
    id_question: number,
    question_difficulty: QuestionIrtClassification | null
};

export class ExerciseDefinitionService {
    private static readonly defaultProgressionDescriptor: ExerciseDefinitionProgressionDescriptor = {
        correctAnswersToUpgrade: 3,
        incorrectAnswersToDowngrade: 2,
        skippedQuestionsToDowngrade: 5,
    };

    constructor(
        private readonly dbConn: DatabaseConnection,
        private readonly courseService: CourseService,
    ) {}

    public async getExerciseDefinition(idDefinition: number): Promise<IExerciseDefinition | null> {
        return (
            await this.dbConn.doQuery<IExerciseDefinition>(
                `SELECT *
                FROM adaptive_exercise.exercise_definition
                WHERE id = $1`,
                [ idDefinition ]
            )
        )?.rows[0] ?? null;
    }

    public async getDefinitionsForCourse(idCourse: number): Promise<IExerciseDefinition[]> {
        return (
            await this.dbConn.doQuery<IExerciseDefinition>(
                `SELECT *
                FROM adaptive_exercise.exercise_definition
                WHERE id_course = $1`,
                [ idCourse ]
            )
        )?.rows ?? [];
    }

    public async createExerciseDefinition(
        idCourse: number,
        exerciseName: string,

        progressionDescriptor: ExerciseDefinitionProgressionDescriptor | null,

        transactionCtx?: TransactionContext,
    ): Promise<number | null> {
        progressionDescriptor ??= ExerciseDefinitionService.defaultProgressionDescriptor;

        const insertedExDef: number | null = (
            await (transactionCtx ?? this.dbConn).doQuery<{ id: number }>(
                `INSERT INTO adaptive_exercise.exercise_definition (
                    id_course,
                    exercise_name,

                    correct_answers_to_upgrade,
                    incorrect_answers_to_downgrade,
                    skipped_questions_to_downgrade
                ) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [
                    idCourse,
                    exerciseName,
                    
                    progressionDescriptor.correctAnswersToUpgrade,
                    progressionDescriptor.incorrectAnswersToDowngrade,
                    progressionDescriptor.skippedQuestionsToDowngrade,
                ]
            )
        )?.rows[0]?.id ?? null;

        return insertedExDef;
    }

    public async updateExerciseDefinition(
        idExerciseDefinition: number,
        progressionDescriptor: ExerciseDefinitionProgressionDescriptor
    ): Promise<boolean> {
        const oldValues = (
            await this.dbConn.doQuery<IExerciseDefinition>(
                `SELECT *
                FROM adaptive_exercise.exercise_definition
                WHERE id = $1`,
                [ idExerciseDefinition ]
            )
        )?.rows[0] ?? null;

        if (oldValues === null) {
            return false;
        }

        return (
            await this.dbConn.doQuery(
                `UPDATE adaptive_exercise.exercise_definition
                    SET (
                        correct_answers_to_upgrade,
                        incorrect_answers_to_downgrade,
                        skipped_questions_to_downgrade
                    ) = ($1, $2, $3)
                WHERE id = $4`,
                [
                    /* $1 */ progressionDescriptor.correctAnswersToUpgrade ??
                        oldValues.correct_answers_to_upgrade,
                    /* $2 */ progressionDescriptor.incorrectAnswersToDowngrade ??
                        oldValues.incorrect_answers_to_downgrade,
                    /* $3 */ progressionDescriptor.skippedQuestionsToDowngrade ??
                        oldValues.skipped_questions_to_downgrade,
                    /* $4 */ idExerciseDefinition,
                ]
            )
        ) !== null;
    }

    public async removeExerciseDefinitions(idDefinitions: number[]): Promise<boolean> {
        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            for (const defId of idDefinitions) {
                await transaction.doQuery(
                    `DELETE FROM exercise_definition WHERE id = $1`,
                    [ defId ]
                );
            }

            await transaction.commit();
            return true;
        } catch {
            return false;
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

    public async getWhitelistedNodes(idDefinition: number): Promise<(IEdgarNode & { whitelisted_on: string })[]> {
        return (
            await this.dbConn.doQuery<(IEdgarNode & { whitelisted_on: string })>(
                `SELECT node.id,
                        node.id_node_type,
                        node.node_name,
                        node.description,

                        node_type.type_name AS node_type_name,

                        exercise_node_whitelist.whitelisted_on
                FROM adaptive_exercise.exercise_node_whitelist
                    JOIN public.node
                        ON exercise_node_whitelist.id_node = node.id
                    JOIN public.node_type
                        ON node.id_node_type = node_type.id
                WHERE id_exercise_definition = $1`,
                [idDefinition]
            )
        )?.rows ?? [];
    }

    public async getWhitelistableNodes(idDefinition: number): Promise<IEdgarNode[] | null> {
        const whitelistedNodeIds: IQuestionNodeWhitelistEntry[] = (
            await this.dbConn.doQuery<IQuestionNodeWhitelistEntry>(
                `SELECT id_node
                FROM adaptive_exercise.exercise_node_whitelist
                WHERE id_exercise_definition = $1`,
                [idDefinition]
            )
        )?.rows ?? [];

        const courseId: number | null = (
            await this.dbConn.doQuery<{ id_course: number }>(
                `SELECT id_course
                FROM adaptive_exercise.exercise_definition
                WHERE id = $1`,
                [ idDefinition ]
            )
        )?.rows[0]?.id_course ?? null;

        if (courseId === null) {
            return null;
        }

        const allCourseNodes = await this.courseService.getCourseNodes(
            (typeof(courseId) === "string") ? parseInt(courseId) : courseId
        );

        return allCourseNodes.filter(cn => (whitelistedNodeIds.find(wn => wn.id_node === cn.id) ?? null) === null);
    }

    public async whitelistNodes(nodes: Omit<IQuestionNodeWhitelistEntry, "whitelisted_on">[]): Promise<boolean> {
        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            const affectedExerciseDefIds: Set<number> = new Set<number>();
            for (const nodeWhitelistEntry of nodes) {
                if (nodeWhitelistEntry.id_exercise_definiton === null || nodeWhitelistEntry.id_node === null) {
                    throw new Error("Invalid entry detected, aborting");
                }

                affectedExerciseDefIds.add(nodeWhitelistEntry.id_exercise_definiton);

                await transaction.doQuery(
                    `INSERT INTO adaptive_exercise.exercise_node_whitelist (id_exercise_definition, id_node)
                        VALUES ($1, $2)`,
                    [
                        /* $1 */ nodeWhitelistEntry.id_exercise_definiton,
                        /* $2 */ nodeWhitelistEntry.id_node,
                    ]
                );
            }

            for (const exerciseDefId of affectedExerciseDefIds) {
                const includedQuestionIds: number[] = (
                    await transaction.doQuery<{ id_question: number }>(
                        `SELECT id_question
                        FROM adaptive_exercise.exercise_question_difficulty
                        WHERE id_exercise_definition = $1`,
                        [ exerciseDefId ]
                    )
                )?.rows?.map(el => el.id_question) ?? [];

                const questionIdsToIncludeIntoExercise: QuestionDifficulty[] = (
                    await transaction.doQuery<QuestionDifficulty>(
                        `SELECT question_node.id_question,
                            question_param_course_level_calculation.question_irt_classification AS question_difficulty
                        FROM adaptive_exercise.exercise_node_whitelist
                            JOIN public.question_node
                                ON exercise_node_whitelist.id_node = question_node.id_node
                            LEFT JOIN statistics_schema.question_param_calculation
                                ON question_param_calculation.id_question = question_node.id_question
                            LEFT JOIN statistics_schema.question_param_course_level_calculation
                                ON question_param_calculation.id =
                                    question_param_course_level_calculation.id_question_param_calculation
                        WHERE exercise_node_whitelist.id_exercise_definition = $1 AND
                            question_node.id_question NOT IN (
                                SELECT id_question
                                FROM adaptive_exercise.exercise_question_difficulty AS eqd
                                WHERE id_exercise_definition = $1
                            )
                        ORDER BY question_node.id_question`,
                        [ exerciseDefId ]
                    )
                )?.rows ?? [];

                for (const idOldQuestion of includedQuestionIds) {
                    const success = (
                        await transaction.doQuery(
                            `UPDATE adaptive_exercise.exercise_question_difficulty SET excluded = FALSE
                            WHERE id_exercise_definition = $1 AND
                                id_question = $2`,
                            [
                                /* $1 */ exerciseDefId,
                                /* $2 */ idOldQuestion,
                            ]
                        )
                    ) !== null;
                    if (!success) {
                        await transaction.rollback();
                        return false;
                    }
                }

                let i = 0;
                while (i < questionIdsToIncludeIntoExercise.length) {
                    const idQuestion = questionIdsToIncludeIntoExercise[i].id_question;
                    const difficulties: QuestionIrtClassification[] = [];

                    while (
                        i < questionIdsToIncludeIntoExercise.length &&
                        questionIdsToIncludeIntoExercise[i].id_question === idQuestion
                    ) {
                        const diff = questionIdsToIncludeIntoExercise[i].question_difficulty ?? null;
                        if (diff !== null) {
                            difficulties.push(diff);
                        }
                        ++i;
                    }

                    const questionAvgDifficulty: QuestionIrtClassification | null =
                        (difficulties.length === 0) ?
                            null : QuestionClassificationUtil.instance.getAverageDifficulty(difficulties);

                    const success = (
                        await transaction.doQuery(
                            `INSERT INTO adaptive_exercise.exercise_question_difficulty (
                                id_exercise_definition,
                                id_question,
                                question_difficulty
                            ) VALUES ($1, $2, $3)`,
                            [
                                /* $1 */  exerciseDefId,
                                /* $2 */  idQuestion,
                                /* $3 */  questionAvgDifficulty,
                            ]
                        )
                    ) !== null;
                    if (!success) {
                        await transaction.rollback();
                        return false;
                    }
                }
            }


            await transaction.commit();

            return true;
        } catch {
            return false;
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

    public async deWhitelistNodes(nodes: Omit<IQuestionNodeWhitelistEntry, "whitelisted_on">[]): Promise<boolean> {
        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");
        
        try {
            const affectedExerciseDefIds: Set<number> = new Set<number>();
            nodes.forEach(node => affectedExerciseDefIds.add(node.id_exercise_definiton));

            for (const exerciseDefId of affectedExerciseDefIds) {
                const success = (
                    await transaction.doQuery(
                        `UPDATE adaptive_exercise.exercise_question_difficulty SET excluded = TRUE
                        WHERE id_question NOT IN (
                            SELECT eqd.id_question
                            FROM adaptive_exercise.exercise_question_difficulty AS eqd
                                JOIN public.question_node AS qn
                                    ON eqd.id_question = qn.id_question
                                JOIN adaptive_exercise.exercise_node_whitelist AS enw
                                    ON qn.id_node = enw.id_node
                            WHERE exercise_question_difficulty.id_exercise_definition = $1
                        )`,
                        [ exerciseDefId ]
                    )
                ) !== null;
                if (!success) {
                    await transaction.rollback();
                    return false;
                }
            }

            for (const node of nodes) {
                await transaction.doQuery(
                    `DELETE FROM adaptive_exercise.exercise_node_whitelist
                    WHERE id_exercise_definition = $1 AND
                        id_node = $2`,
                    [
                        /* $1 */ node.id_exercise_definiton,
                        /* $2 */ node.id_node,
                    ]
                );
            }

            await transaction.commit();

            return true;
        } catch {
            return false;
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

    public async getQuestionDifficultyInformation(idExerciseDefinition: number): Promise<IQuestionDifficultyInfo[]> {
        const difficultyInfo = (
            await this.dbConn.doQuery<IQuestionDifficultyInfo>(
                `SELECT question.id AS id_question,
                        question.question_text,
                        question_difficulty,
                        question_difficulty_override,
                        CASE
                            WHEN question_difficulty_override IS NULL THEN FALSE
                            ELSE TRUE
                        END AS is_override
                FROM adaptive_exercise.exercise_question_difficulty
                    JOIN public.question
                        ON exercise_question_difficulty.id_question = question.id
                WHERE id_exercise_definition = $1 AND
                    question.is_active AND
                    NOT excluded
                ORDER BY is_override DESC, id_question`,
                [ idExerciseDefinition ]
            )
        )?.rows ?? [];

        return difficultyInfo;
    }

    public async getQuestionDifficultyOverrides(
        idExerciseDefinition: number
    ): Promise<IExerciseQuestionDifficultyOverride[]> {
        return (
            await this.dbConn.doQuery<IExerciseQuestionDifficultyOverride>(
                `SELECT *
                FROM adaptive_exercise.exercise_question_difficulty
                WHERE id_exercise_definition = $1 AND
                    question_difficulty_override IS NOT NULL AND
                    NOT excluded`,
                [ idExerciseDefinition ]
            )
        )?.rows ?? [];
    }

    public async overrideQuestionDifficulties(
        idExerciseDefinition: number,
        overrideInfo: { idQuestion: number, newDifficulty: QuestionIrtClassification | null }[]
    ): Promise<boolean> {
        const transaction = await this.dbConn.beginTransaction('adaptive_exercise');

        try {
            for (const questionOverride of overrideInfo) {
                const queryRes = (
                    await transaction.doQuery(
                        `UPDATE exercise_question_difficulty
                        SET question_difficulty_override = $1
                        WHERE id_exercise_definition = $2 AND id_question = $3`,
                        [
                            /* $1 */ questionOverride.newDifficulty ?? null,
                            /* $2 */ idExerciseDefinition,
                            /* $3 */ questionOverride.idQuestion,
                        ]
                    )
                );
                if (queryRes === null) {
                    await transaction.rollback();
                    return false;
                }
            }

            await transaction.commit();
            return true;
        } catch {
            return false;
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }
}
