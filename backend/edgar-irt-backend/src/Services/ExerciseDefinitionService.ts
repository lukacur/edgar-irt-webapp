import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { TransactionContext } from "../Database/TransactionContext.js";
import { IExerciseDefinition } from "../Models/Database/AdaptiveExercise/IExerciseDefinition.js";
import { IQuestionNodeWhitelistEntry } from "../Models/Database/AdaptiveExercise/IQuestionNodeWhitelistEntry.js";
import { IEdgarNode } from "../Models/Database/Edgar/IEdgarNode.js";
import { CourseService } from "./CourseService.js";

export type ExerciseDefinitionProgressionDescriptor = {
    correctAnswersToUpgrade: number;
    incorrectAnswersToDowngrade: number;
    skippedQuestionsToDowngrade: number;
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
            for (const nodeWhitelistEntry of nodes) {
                if (nodeWhitelistEntry.id_exercise_definiton === null || nodeWhitelistEntry.id_node === null) {
                    throw new Error("Invalid entry detected, aborting");
                }

                await transaction.doQuery(
                    `INSERT INTO adaptive_exercise.exercise_node_whitelist (id_exercise_definition, id_node)
                        VALUES ($1, $2)`,
                    [
                        nodeWhitelistEntry.id_exercise_definiton,
                        nodeWhitelistEntry.id_node,
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

    public async deWhitelistNodes(nodes: Omit<IQuestionNodeWhitelistEntry, "whitelisted_on">[]): Promise<boolean> {
        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
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
}
