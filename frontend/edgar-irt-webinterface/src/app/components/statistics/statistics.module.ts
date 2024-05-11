import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatisticsAvailableActionsComponent } from './statistics-available-actions/statistics-available-actions.component';
import { QuestionStatisticsComponent } from './question-statistics/question-statistics.component';
import { QuestionIrtOverviewComponent } from './question-irt-overview/question-irt-overview.component';
import { Route, RouterModule } from '@angular/router';
import { MatButtonModule, MatIconModule, MatSortModule, MatTableModule } from '@angular/material';
import { ReactiveFormsModule } from '@angular/forms';
import { AppCommonModule } from '../common/app-common.module';
import { AppDirectivesModule } from 'src/app/app-directives/app-directives.module';
import { QuestionStatisticsPlotComponent } from './question-statistics-plot/question-statistics-plot.component';

const routes: Route[] = [
  {
      path: "",
      pathMatch: "full",
      component: StatisticsAvailableActionsComponent,
  },
  {
      path: "question-statistics",
      pathMatch: "full",
      component: QuestionStatisticsComponent,
  },
  {
      path: "question-statistics-plot",
      pathMatch: "full",
      component: QuestionStatisticsPlotComponent,
  },
  {
      path: "question-irt-overview/:idQuestion",
      component: QuestionIrtOverviewComponent,
  },
  {
      path: "question-irt-overview",
      pathMatch: "full",
      redirectTo: "",
  },
];

@NgModule({
  declarations: [
    StatisticsAvailableActionsComponent,
    QuestionStatisticsComponent,
    QuestionIrtOverviewComponent,
    QuestionStatisticsPlotComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    AppCommonModule,
    AppDirectivesModule,
  ]
})
export class StatisticsModule { }
