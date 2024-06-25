import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { IQuestion } from "../Models/Database/Edgar/IQuestion.js";
import { IQuestionAnswer } from "../Models/Database/Edgar/IQuestionAnswer.js";

export class EdgarService {
    constructor(
        private readonly dbConn: DatabaseConnection,
    ) {}

    public async getQuestionAnswers(idQuestion: number, includeCorrectness = false): Promise<IQuestionAnswer[] | null> {
        const answers: IQuestionAnswer[] | null = (
            await this.dbConn.doQuery<IQuestionAnswer>(
                `SELECT id,
                        ordinal,
                        answer_text${includeCorrectness ? ', is_correct' : ''}
                FROM public.question_answer
                WHERE id_question = $1`,
                [idQuestion]
            )
        )?.rows ?? null;

        return answers;
    }

    public async getQuestionInfo(idQuestion: number): Promise<IQuestion | null> {
        return (
            await this.dbConn.doQuery<IQuestion>(
                `SELECT *
                FROM public.question
                WHERE id = $1`,
                [idQuestion]
            )
        )?.rows[0] ?? null;
    }
}
