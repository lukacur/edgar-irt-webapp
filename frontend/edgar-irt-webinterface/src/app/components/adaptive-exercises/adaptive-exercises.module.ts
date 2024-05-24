import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { AdaptiveExercisesAvailableActionsComponent } from './adaptive-exercises-available-actions/adaptive-exercises-available-actions.component';
import { MyExercisesComponent } from './my-exercises/my-exercises.component';
import { ExercisesQuestionTypesOverviewComponent } from './exercises-question-types-overview/exercises-question-types-overview.component';
import { ExercisesQuestionNodeWhitelistOverviewComponent } from './exercises-question-node-whitelist-overview/exercises-question-node-whitelist-overview.component';
import { MatButtonModule, MatCheckboxModule, MatSlideToggleModule } from '@angular/material';
import { AppCommonModule } from '../common/app-common.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExerciseComponent } from './exercise/exercise.component';
import { AppDirectivesModule } from 'src/app/app-directives/app-directives.module';
import { ExerciseDefinitionComponent } from './exercise-definition/exercise-definition.component';

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
    path: "exercise",
    pathMatch: "full",
    component: ExerciseComponent,
  },
  {
    path: "question-types-overview",
    pathMatch: "full",
    component: ExercisesQuestionTypesOverviewComponent,
  },
  {
    path: "question-whitelist-overview",
    pathMatch: "full",
    component: ExercisesQuestionNodeWhitelistOverviewComponent,
  },
  {
    path: "exercise-definition",
    pathMatch: "full",
    component: ExerciseDefinitionComponent,
  },
];

@NgModule({
  declarations: [
    AdaptiveExercisesAvailableActionsComponent,
    MyExercisesComponent,
    ExercisesQuestionTypesOverviewComponent,
    ExercisesQuestionNodeWhitelistOverviewComponent,
    ExerciseComponent,
    ExerciseDefinitionComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    MatButtonModule,
    AppCommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    AppDirectivesModule,
  ]
})
export class AdaptiveExercisesModule { }
