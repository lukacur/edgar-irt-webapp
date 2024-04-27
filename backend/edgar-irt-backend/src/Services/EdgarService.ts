import { DatabaseConnection } from "../Database/DatabaseConnection.js";
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
}