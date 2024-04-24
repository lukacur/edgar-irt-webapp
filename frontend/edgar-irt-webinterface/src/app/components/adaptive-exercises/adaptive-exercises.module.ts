import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { AdaptiveExercisesAvailableActionsComponent } from './adaptive-exercises-available-actions/adaptive-exercises-available-actions.component';
import { MyExercisesComponent } from './my-exercises/my-exercises.component';
import { ExercisesQuestionTypesOverviewComponent } from './exercises-question-types-overview/exercises-question-types-overview.component';
import { ExercisesQuestionBlacklistOverviewComponent } from './exercises-question-blacklist-overview/exercises-question-blacklist-overview.component';
import { MatButtonModule } from '@angular/material';
import { AppCommonModule } from '../common/app-common.module';
import { ReactiveFormsModule } from '@angular/forms';

const routes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: AdaptiveExercisesAvailableActionsComponent,
  },
  {
    path: "my-exercises",
    pathMatch: "full",
    component: MyExercisesComponent,
  },
  {
    path: "question-types-overview",
    pathMatch: "full",
    component: ExercisesQuestionTypesOverviewComponent,
  },
  {
    path: "question-blacklist-overview",
    pathMatch: "full",
    component: ExercisesQuestionBlacklistOverviewComponent,
  },
];

@NgModule({
  declarations: [
    AdaptiveExercisesAvailableActionsComponent,
    MyExercisesComponent,
    ExercisesQuestionTypesOverviewComponent,
    ExercisesQuestionBlacklistOverviewComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    MatButtonModule,
    AppCommonModule,
    ReactiveFormsModule,
  ]
})
export class AdaptiveExercisesModule { }
