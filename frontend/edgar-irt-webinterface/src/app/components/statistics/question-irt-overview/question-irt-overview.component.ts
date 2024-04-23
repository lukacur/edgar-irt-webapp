import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LogisticFunction } from 'src/app/models/irt/logistic-function.model';
import { IQuestionIrtParameters } from 'src/app/models/irt/question-irt-parameters.model';
import { StatisticsService } from 'src/app/services/statistics.service';

@Component({
    selector: 'app-question-irt-overview',
    templateUrl: './question-irt-overview.component.html',
})
export class QuestionIrtOverviewComponent implements OnInit {
    idQuestion: number = null!;
    dataLoaded: boolean = false;
    questionInfo: IQuestionIrtParameters[] | null = null;

    constructor(
        private readonly statisticsService: StatisticsService,

        private readonly router: Router,
        private readonly route: ActivatedRoute,
    ) { }

    ngOnInit(): void {
        if (!this.route.snapshot.paramMap.has("idQuestion")) {
            this.router.navigate([""]);
            return;
        }

        this.idQuestion = parseInt(this.route.snapshot.paramMap.get("idQuestion")!);

        this.statisticsService.getQuestionIRTParameters(this.idQuestion)
            .subscribe(qIrtParams => {
                this.questionInfo = qIrtParams;
                this.dataLoaded = true;
            });
    }

    prepareLogisticFunction(questionIrtParams: IQuestionIrtParameters): (theta: number) => number {
        const logFn = LogisticFunction.withParams(
            {
                levelOfItemKnowledge: questionIrtParams.level_of_item_knowledge,
                itemDifficulty: questionIrtParams.item_difficulty,
                itemGuessProbability: questionIrtParams.item_guess_probability,
                itemMistakeProbability: questionIrtParams.item_mistake_probability,
            },
            questionIrtParams.default_item_offset_parameter
        );

        return (theta: number) => logFn.fourParamLogisticFn(theta);
    }

}
