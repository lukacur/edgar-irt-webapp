import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobAvailableActionsComponent } from './job-available-actions/job-available-actions.component';
import { MatButtonModule } from '@angular/material/button';
import { Route, RouterModule } from '@angular/router';
import { JobOverviewComponent } from './job-overview/job-overview.component';
import { JobListItemComponent } from './job-overview/job-list-item/job-list-item.component';
import { MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule } from '@angular/material';
import { JobStepItemComponent } from './job-overview/job-list-item/job-step-item/job-step-item.component';
import { JobExecutionComponent } from './job-execution/job-execution.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppDirectivesModule } from 'src/app/app-directives/app-directives.module';
import { AppCommonModule } from '../common/app-common.module';

const routes: Route[] = [
    {
        path: "",
        pathMatch: "full",
        component: JobAvailableActionsComponent,
    },
    {
        path: "overview",
        pathMatch: "full",
        component: JobOverviewComponent,
    },
    {
        path: "execution",
        pathMatch: "full",
        component: JobExecutionComponent,
    },
];


@NgModule({
    declarations: [
        JobAvailableActionsComponent,
        JobOverviewComponent,
        JobListItemComponent,
        JobStepItemComponent,
        JobExecutionComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatSlideToggleModule,
        MatProgressSpinnerModule,
        FormsModule,
        ReactiveFormsModule,
        AppCommonModule,
        AppDirectivesModule,
    ]
})
export class JobModule { }
