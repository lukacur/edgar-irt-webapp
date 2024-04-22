import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatisticsAvailableActionsComponent } from './statistics-available-actions/statistics-available-actions.component';
import { QuestionStatisticsComponent } from './question-statistics/question-statistics.component';
import { QuestionIrtOverviewComponent } from './question-irt-overview/question-irt-overview.component';
import { Route, RouterModule } from '@angular/router';
import { MatButtonModule, MatIconModule, MatSortModule, MatTableModule } from '@angular/material';
import { ReactiveFormsModule } from '@angular/forms';

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
      path: "question-irt-overview",
      pathMatch: "full",
      component: QuestionIrtOverviewComponent,
  },
];

@NgModule({
  declarations: [
    StatisticsAvailableActionsComponent,
    QuestionStatisticsComponent,
    QuestionIrtOverviewComponent
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
  ]
})
export class StatisticsModule { }
